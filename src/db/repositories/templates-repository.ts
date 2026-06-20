import type { ProperlyPackedDatabase } from "../schema";
import { appDb } from "../schema";
import { tripMatchesContext } from "../trip-context-matching";
import type {
  ContextOption,
  ItemOwnershipScope,
  PackingItem,
  PackingStatus,
  Template,
  TemplateConditionRule,
  TemplateItem,
  Traveller,
  TravellerType,
  Trip,
} from "../types";

export type TemplateSuggestion = {
  key: string;
  template: Template;
  templateItem: TemplateItem;
  ownershipScope: ItemOwnershipScope;
  ownerTraveller?: Traveller;
  packingStatus: PackingStatus;
  status: "new" | "duplicate" | "skipped";
  reason: string;
};

export type TemplatePreview = {
  template: Template;
  suggestions: TemplateSuggestion[];
  newCount: number;
  duplicateCount: number;
  skippedCount: number;
};

export type ApplyTemplateResult = {
  inserted: number;
  skippedDuplicates: number;
  skippedUnmatched: number;
};

export async function listTemplates(db: ProperlyPackedDatabase = appDb) {
  const templates = await db.templates.toArray();
  return templates
    .filter((template) => template.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listTemplateItems(
  templateId: string,
  db: ProperlyPackedDatabase = appDb,
) {
  return db.templateItems.where("templateId").equals(templateId).sortBy("name");
}

export async function getTemplate(
  templateId: string,
  db: ProperlyPackedDatabase = appDb,
) {
  return db.templates.get(templateId);
}

export async function previewTemplatesForTrip(
  trip: Trip,
  travellers: Traveller[],
  db: ProperlyPackedDatabase = appDb,
) {
  const [templates, templateItems, existingItems, contextOptions] = await Promise.all([
    listTemplates(db),
    db.templateItems.toArray(),
    db.packingItems.where("tripId").equals(trip.id).toArray(),
    db.contextOptions.toArray(),
  ]);

  return templates
    .filter((template) => templateAppliesToTrip(template, trip, contextOptions))
    .map((template) =>
      buildTemplatePreview(
        template,
        templateItems.filter((item) => item.templateId === template.id),
        trip,
        travellers,
        existingItems,
        contextOptions,
      ),
    )
    .sort(
      (a, b) =>
        b.newCount - a.newCount || a.template.name.localeCompare(b.template.name),
    );
}

export async function previewTemplateForTrip(
  templateId: string,
  trip: Trip,
  travellers: Traveller[],
  db: ProperlyPackedDatabase = appDb,
) {
  const template = await getTemplate(templateId, db);
  if (!template) throw new Error("Template not found.");

  const [templateItems, existingItems, contextOptions] = await Promise.all([
    listTemplateItems(template.id, db),
    db.packingItems.where("tripId").equals(trip.id).toArray(),
    db.contextOptions.toArray(),
  ]);

  return buildTemplatePreview(
    template,
    templateItems,
    trip,
    travellers,
    existingItems,
    contextOptions,
  );
}

export async function applyTemplateToTrip(
  templateId: string,
  trip: Trip,
  travellers: Traveller[],
  db: ProperlyPackedDatabase = appDb,
): Promise<ApplyTemplateResult> {
  // Rebuild the preview at mutation time so duplicates added since the visible
  // preview are still protected.
  const preview = await previewTemplateForTrip(templateId, trip, travellers, db);
  const newSuggestions = preview.suggestions.filter(
    (suggestion) => suggestion.status === "new",
  );
  const now = new Date().toISOString();
  const items: PackingItem[] = newSuggestions.map((suggestion) => ({
    id: createId("packing-item"),
    tripId: trip.id,
    name: suggestion.templateItem.name,
    ownershipScope: suggestion.ownershipScope,
    ownerTravellerId: suggestion.ownerTraveller?.id,
    category: suggestion.templateItem.category,
    quantity: suggestion.templateItem.quantity,
    priority: suggestion.templateItem.priority,
    status: suggestion.packingStatus,
    flags: [...suggestion.templateItem.flags],
    dependencyItemIds: [],
    source: "template",
    sourceId: suggestion.templateItem.id,
    notes:
      suggestion.templateItem.notes ??
      `Generated from ${preview.template.name} template.`,
    forgottenRisk: false,
    createdAt: now,
    updatedAt: now,
  }));

  if (items.length > 0) await db.packingItems.bulkAdd(items);

  return {
    inserted: items.length,
    skippedDuplicates: preview.duplicateCount,
    skippedUnmatched: preview.skippedCount,
  };
}

export function buildTemplatePreview(
  template: Template,
  templateItems: TemplateItem[],
  trip: Trip,
  travellers: Traveller[],
  existingItems: PackingItem[],
  contextOptions: ContextOption[] = [],
): TemplatePreview {
  const tripTravellers = travellers.filter(
    (traveller) =>
      trip.travellerIds.includes(traveller.id) && !traveller.archivedAt,
  );
  const seenKeys = new Set(
    existingItems
      .filter((item) => !item.archivedAt)
      .map((item) =>
        duplicateKey(
          item.tripId,
          item.name,
          item.ownershipScope,
          item.ownerTravellerId,
          item.category,
        ),
      ),
  );

  const suggestions = templateItems.flatMap<TemplateSuggestion>((templateItem) => {
    const packingStatus = getTemplatePackingStatus(templateItem);
    if (!rulesApply(templateItem.conditionRules, trip, contextOptions)) {
      return [
        suggestion(
          template,
          templateItem,
          "unassigned",
          packingStatus,
          "skipped",
          "Skipped because this trip does not match the item’s conditions.",
        ),
      ];
    }

    const ownerships = resolveTemplateOwnership(
      templateItem.ownerType,
      tripTravellers,
    );
    if (ownerships.length === 0) {
      return [
        suggestion(
          template,
          templateItem,
          "unassigned",
          packingStatus,
          "skipped",
          `Skipped because no matching ${ownerTypeLabel(templateItem.ownerType)} is selected for this trip.`,
        ),
      ];
    }

    return ownerships.map((ownership) => {
      const key = duplicateKey(
        trip.id,
        templateItem.name,
        ownership.ownershipScope,
        ownership.ownerTraveller?.id,
        templateItem.category,
      );
      if (seenKeys.has(key)) {
        return suggestion(
          template,
          templateItem,
          ownership.ownershipScope,
          packingStatus,
          "duplicate",
          "Skipped because this item already exists for the same owner and category.",
          ownership.ownerTraveller,
        );
      }

      seenKeys.add(key);
      return suggestion(
        template,
        templateItem,
        ownership.ownershipScope,
        packingStatus,
        "new",
        buildSuggestionReason(
          template,
          templateItem,
          ownership.ownershipScope,
          ownership.ownerTraveller,
          trip,
          contextOptions,
        ),
        ownership.ownerTraveller,
      );
    });
  });

  return {
    template,
    suggestions,
    newCount: suggestions.filter((item) => item.status === "new").length,
    duplicateCount: suggestions.filter((item) => item.status === "duplicate").length,
    skippedCount: suggestions.filter((item) => item.status === "skipped").length,
  };
}

export function templateAppliesToTrip(
  template: Template,
  trip: Trip,
  contextOptions: ContextOption[] = [],
) {
  const tripTypeMatch = template.applicableTripTypes.includes(trip.tripType);
  const contextMatch = template.applicableContexts.some((context) =>
      tripMatchesContext(trip, context, contextOptions),
    );
  return (
    template.active &&
    ((template.applicableTripTypes.length === 0 && template.applicableContexts.length === 0) ||
      tripTypeMatch ||
      contextMatch)
  );
}

export function rulesApply(
  rules: TemplateConditionRule[],
  trip: Trip,
  contextOptions: ContextOption[] = [],
) {
  return rules.every((rule) => {
    if (isContextRule(rule.field)) {
      const matches = tripMatchesContext(trip, rule.value, contextOptions);
      return rule.operator === "not-includes" ? !matches : matches;
    }
    const fieldValue = getTripRuleValue(rule.field, trip);
    if (Array.isArray(fieldValue)) {
      if (rule.operator === "includes") return fieldValue.includes(rule.value);
      if (rule.operator === "not-includes") return !fieldValue.includes(rule.value);
      return fieldValue.length === 1 && fieldValue[0] === rule.value;
    }
    if (rule.operator === "equals") return fieldValue === rule.value;
    if (rule.operator === "not-includes") return fieldValue !== rule.value;
    return fieldValue === rule.value;
  });
}

export function hasDuplicatePackingItem(
  items: PackingItem[],
  name: string,
  ownershipScope: ItemOwnershipScope,
  ownerTravellerId?: string,
  category?: string,
  tripId?: string,
) {
  const key = duplicateKey(
    tripId ?? items[0]?.tripId ?? "",
    name,
    ownershipScope,
    ownerTravellerId,
    category ?? "",
  );
  return items.some(
    (item) =>
      !item.archivedAt &&
      duplicateKey(
        tripId ?? item.tripId,
        item.name,
        item.ownershipScope,
        item.ownerTravellerId,
        category === undefined ? "" : item.category,
      ) === key,
  );
}

function resolveTemplateOwnership(
  ownerType: TemplateItem["ownerType"],
  tripTravellers: Traveller[],
): Array<{
  ownershipScope: ItemOwnershipScope;
  ownerTraveller?: Traveller;
}> {
  if (ownerType === "shared") return [{ ownershipScope: "shared" }];
  if (ownerType === "unassigned") return [{ ownershipScope: "unassigned" }];
  if (ownerType === "each-traveller") {
    return tripTravellers.map((ownerTraveller) => ({
      ownershipScope: "traveller",
      ownerTraveller,
    }));
  }

  const type: TravellerType =
    ownerType === "selected-adult"
      ? "adult"
      : ownerType === "selected-child"
        ? "child"
        : ownerType;
  return tripTravellers
    .filter((traveller) => traveller.travellerType === type)
    .map((ownerTraveller) => ({ ownershipScope: "traveller", ownerTraveller }));
}

function suggestion(
  template: Template,
  templateItem: TemplateItem,
  ownershipScope: ItemOwnershipScope,
  packingStatus: PackingStatus,
  status: TemplateSuggestion["status"],
  reason: string,
  ownerTraveller?: Traveller,
): TemplateSuggestion {
  return {
    key: `${templateItem.id}:${ownershipScope}:${ownerTraveller?.id ?? "none"}`,
    template,
    templateItem,
    ownershipScope,
    ownerTraveller,
    packingStatus,
    status,
    reason,
  };
}

function buildSuggestionReason(
  template: Template,
  templateItem: TemplateItem,
  ownershipScope: ItemOwnershipScope,
  ownerTraveller: Traveller | undefined,
  trip: Trip,
  contextOptions: ContextOption[],
) {
  const matchedContext = [
    ...templateItem.conditionRules
      .filter((rule) => isContextRule(rule.field) && rule.operator !== "not-includes")
      .map((rule) => rule.value),
    ...template.applicableContexts,
  ].find((context) => tripMatchesContext(trip, context, contextOptions));
  const source = matchedContext
    ? `Suggested by ${template.name} template because this trip matches ${humanise(matchedContext)}.`
    : `Suggested by ${template.name} template.`;
  if (ownershipScope === "shared") return `${source} Suggested as a shared trip item.`;
  if (ownershipScope === "unassigned") return `${source} Ownership can be decided later.`;
  return `${source} Suggested for ${ownerTraveller?.name ?? "a selected traveller"}.`;
}

function getTemplatePackingStatus(templateItem: TemplateItem): PackingStatus {
  const flags = new Set(templateItem.flags);
  if (flags.has("to-buy") || flags.has("buy")) return "to-buy";
  if (flags.has("to-wash") || flags.has("wash")) return "to-wash";
  if (flags.has("to-charge") || flags.has("charge")) return "to-charge";
  if (flags.has("to-download") || flags.has("download")) return "to-download";
  if (flags.has("to-decide") || flags.has("decide")) return "to-decide";
  return "needed";
}

function duplicateKey(
  tripId: string,
  name: string,
  ownershipScope: ItemOwnershipScope,
  ownerTravellerId: string | undefined,
  category: string,
) {
  return [
    tripId,
    normaliseItemName(name),
    ownershipScope,
    ownerTravellerId ?? "",
    category.trim().toLocaleLowerCase(),
  ].join("|");
}

function isContextRule(field: TemplateConditionRule["field"]) {
  return [
    "climateContextIds",
    "activityContextIds",
    "transportContextIds",
    "accommodationContextIds",
    "activityContexts",
    "transportModes",
    "accommodationTypes",
    "climateProfile",
  ].includes(field);
}

function getTripRuleValue(field: TemplateConditionRule["field"], trip: Trip) {
  return field === "travellers" ? trip.travellerIds : trip[field];
}

function ownerTypeLabel(ownerType: TemplateItem["ownerType"]) {
  if (ownerType === "each-traveller") return "traveller";
  if (ownerType === "selected-adult") return "adult traveller";
  if (ownerType === "selected-child") return "child traveller";
  if (ownerType === "dog") return "dog traveller";
  return humanise(ownerType);
}

function humanise(value: string) {
  return value.replace(/^.*:/, "").replace(/-/g, " ");
}

function normaliseItemName(name: string) {
  return name.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
