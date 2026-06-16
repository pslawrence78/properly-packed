import type { ProperlyPackedDatabase } from "../schema";
import { appDb } from "../schema";
import type {
  PackingItem,
  Template,
  TemplateConditionRule,
  TemplateItem,
  Traveller,
  TravellerType,
  Trip,
} from "../types";

export type TemplateSuggestion = {
  template: Template;
  templateItem: TemplateItem;
  ownerTraveller?: Traveller;
  status: "new" | "duplicate" | "skipped";
  reason?: string;
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
  const [templates, templateItems, existingItems] = await Promise.all([
    listTemplates(db),
    db.templateItems.toArray(),
    db.packingItems.where("tripId").equals(trip.id).toArray(),
  ]);

  return templates
    .filter((template) => templateAppliesToTrip(template, trip))
    .map((template) =>
      buildTemplatePreview(
        template,
        templateItems.filter((item) => item.templateId === template.id),
        trip,
        travellers,
        existingItems,
      ),
    )
    .sort((a, b) => b.newCount - a.newCount || a.template.name.localeCompare(b.template.name));
}

export async function previewTemplateForTrip(
  templateId: string,
  trip: Trip,
  travellers: Traveller[],
  db: ProperlyPackedDatabase = appDb,
) {
  const template = await getTemplate(templateId, db);

  if (!template) {
    throw new Error("Template not found.");
  }

  const [templateItems, existingItems] = await Promise.all([
    listTemplateItems(template.id, db),
    db.packingItems.where("tripId").equals(trip.id).toArray(),
  ]);

  return buildTemplatePreview(template, templateItems, trip, travellers, existingItems);
}

export async function applyTemplateToTrip(
  templateId: string,
  trip: Trip,
  travellers: Traveller[],
  db: ProperlyPackedDatabase = appDb,
): Promise<ApplyTemplateResult> {
  const preview = await previewTemplateForTrip(templateId, trip, travellers, db);
  const newSuggestions = preview.suggestions.filter(
    (suggestion) => suggestion.status === "new" && suggestion.ownerTraveller,
  );
  const now = new Date().toISOString();
  const items: PackingItem[] = newSuggestions.map((suggestion) => ({
    id: createId("packing-item"),
    tripId: trip.id,
    name: suggestion.templateItem.name,
    ownerTravellerId: suggestion.ownerTraveller!.id,
    category: suggestion.templateItem.category,
    quantity: suggestion.templateItem.quantity,
    priority: suggestion.templateItem.priority,
    status: "needed",
    flags: [...suggestion.templateItem.flags],
    dependencyItemIds: [],
    source: "template",
    sourceId: suggestion.templateItem.id,
    notes: `Generated from ${preview.template.name}.`,
    forgottenRisk: false,
    createdAt: now,
    updatedAt: now,
  }));

  if (items.length > 0) {
    await db.packingItems.bulkAdd(items);
  }

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
): TemplatePreview {
  const tripTravellers = travellers.filter((traveller) =>
    trip.travellerIds.includes(traveller.id),
  );

  const suggestions = templateItems.map((templateItem) => {
    if (!rulesApply(templateItem.conditionRules, trip)) {
      return {
        template,
        templateItem,
        status: "skipped" as const,
        reason: "Trip context does not match.",
      };
    }

    const ownerTraveller = resolveTemplateOwner(templateItem.ownerType, tripTravellers);

    if (!ownerTraveller) {
      return {
        template,
        templateItem,
        status: "skipped" as const,
        reason: "No matching traveller is on this trip.",
      };
    }

    if (hasDuplicatePackingItem(existingItems, templateItem.name, ownerTraveller.id)) {
      return {
        template,
        templateItem,
        ownerTraveller,
        status: "duplicate" as const,
        reason: "Already on this packing list.",
      };
    }

    return {
      template,
      templateItem,
      ownerTraveller,
      status: "new" as const,
    };
  });

  return {
    template,
    suggestions,
    newCount: suggestions.filter((suggestion) => suggestion.status === "new").length,
    duplicateCount: suggestions.filter((suggestion) => suggestion.status === "duplicate")
      .length,
    skippedCount: suggestions.filter((suggestion) => suggestion.status === "skipped")
      .length,
  };
}

export function templateAppliesToTrip(template: Template, trip: Trip) {
  const tripTypeMatch =
    template.applicableTripTypes.length === 0 ||
    template.applicableTripTypes.includes(trip.tripType);
  const contextMatch =
    template.applicableContexts.length === 0 ||
    template.applicableContexts.some((context) =>
      trip.activityContexts.includes(context) ||
      trip.accommodationTypes.includes(context) ||
      trip.transportModes.includes(context) ||
      trip.climateProfile === context,
    );

  return template.active && tripTypeMatch && contextMatch;
}

export function rulesApply(rules: TemplateConditionRule[], trip: Trip) {
  return rules.every((rule) => {
    const fieldValue = getTripRuleValue(rule.field, trip);

    if (Array.isArray(fieldValue)) {
      if (rule.operator === "includes") {
        return fieldValue.includes(rule.value);
      }

      if (rule.operator === "not-includes") {
        return !fieldValue.includes(rule.value);
      }

      return fieldValue.length === 1 && fieldValue[0] === rule.value;
    }

    if (rule.operator === "equals") {
      return fieldValue === rule.value;
    }

    if (rule.operator === "not-includes") {
      return fieldValue !== rule.value;
    }

    return fieldValue === rule.value;
  });
}

export function hasDuplicatePackingItem(
  items: PackingItem[],
  name: string,
  ownerTravellerId: string,
) {
  const normalisedName = normaliseItemName(name);

  return items.some(
    (item) =>
      !item.archivedAt &&
      item.ownerTravellerId === ownerTravellerId &&
      normaliseItemName(item.name) === normalisedName,
  );
}

function resolveTemplateOwner(
  ownerType: TemplateItem["ownerType"],
  tripTravellers: Traveller[],
) {
  if (ownerType === "selected-adult") {
    return findTravellerByType(tripTravellers, "adult");
  }

  if (ownerType === "selected-child") {
    return findTravellerByType(tripTravellers, "child");
  }

  return findTravellerByType(tripTravellers, ownerType);
}

function findTravellerByType(travellers: Traveller[], travellerType: TravellerType) {
  return travellers.find((traveller) => traveller.travellerType === travellerType);
}

function getTripRuleValue(field: TemplateConditionRule["field"], trip: Trip) {
  if (field === "travellers") {
    return trip.travellerIds;
  }

  return trip[field];
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
