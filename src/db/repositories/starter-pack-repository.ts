import type { ProperlyPackedDatabase } from "../schema";
import { appDb } from "../schema";
import { tripMatchesContext } from "../trip-context-matching";
import type { ContextOption, PackingItem, Traveller, Trip } from "../types";
import {
  applyGadgetBundleToTrip,
  previewGadgetBundleForTrip,
  previewGadgetBundlesForTrip,
  type GadgetBundlePreview,
} from "./gadget-bundles-repository";
import {
  applyTemplateToTrip,
  hasDuplicatePackingItem,
  previewTemplatesForTrip,
  type TemplatePreview,
} from "./templates-repository";
import {
  addUsefulExtraToTrip,
  extraAppliesToTrip,
  listUsefulExtras,
  type UsefulExtraSuggestion,
} from "./useful-extras-repository";

export type StarterPackTemplate = TemplatePreview & { reason: string };
export type StarterPackExtra = UsefulExtraSuggestion & { reason: string };
export type StarterPackBundle = GadgetBundlePreview & { reason: string };

export type StarterPackPreview = {
  trip: Trip;
  travellers: Traveller[];
  templates: StarterPackTemplate[];
  usefulExtras: StarterPackExtra[];
  gadgetBundles: StarterPackBundle[];
  alreadyIncluded: PackingItem[];
  newSuggestionCount: number;
  duplicateCount: number;
};

export type ApplyStarterPackInput = {
  trip: Trip;
  travellers: Traveller[];
  templateIds?: string[];
  usefulExtraIds?: string[];
  gadgetBundles?: Array<{
    bundleId: string;
    ownerTravellerId: string;
    optionalItemIds?: string[];
  }>;
};

export type ApplyStarterPackResult = {
  itemsAdded: number;
  tasksCreated: number;
  duplicatesSkipped: number;
  summary: string;
};

export async function previewStarterPack(
  trip: Trip,
  travellers: Traveller[],
  db: ProperlyPackedDatabase = appDb,
): Promise<StarterPackPreview> {
  const tripTravellers = travellers.filter(
    (traveller) => trip.travellerIds.includes(traveller.id) && !traveller.archivedAt,
  );
  const [templates, extras, bundleMatches, existingItems, contextOptions] =
    await Promise.all([
      previewTemplatesForTrip(trip, travellers, db),
      listUsefulExtras(db),
      previewGadgetBundlesForTrip(trip, travellers, db),
      db.packingItems.where("tripId").equals(trip.id).toArray(),
      db.contextOptions.toArray(),
    ]);

  const hasChild = tripTravellers.some((traveller) => traveller.travellerType === "child");
  const hasDog = tripTravellers.some((traveller) => traveller.travellerType === "dog");
  const dogFriendly = tripMatchesContext(trip, "dog-friendly-stay", contextOptions);
  const relevantExtras = extras
    .filter((extra) => {
      const tripTypeMatch =
        extra.applicableTripTypes.length === 0 ||
        extra.applicableTripTypes.includes(trip.tripType);
      if (extra.applicableContexts.includes("kids")) return tripTypeMatch && hasChild;
      if (extra.category === "pet") return tripTypeMatch && (hasDog || dogFriendly);
      return extraAppliesToTrip(extra, trip, contextOptions);
    })
    .map((extra): UsefulExtraSuggestion => ({
      extra,
      status:
        extra.neverSuggest && !extra.alwaysSuggest
          ? "hidden"
          : hasDuplicatePackingItem(existingItems, extra.name, "shared")
            ? "duplicate"
            : "new",
    }))
    .filter(({ status }) => status !== "hidden")
    .map((suggestion) => ({
      ...suggestion,
      reason: extraReason(suggestion, trip, tripTravellers, contextOptions),
    }));

  const defaultOwner =
    tripTravellers.find((traveller) => traveller.travellerType === "adult") ??
    tripTravellers[0];
  const bundles = await Promise.all(
    bundleMatches.map((match) =>
      previewGadgetBundleForTrip(
        match.bundle.id,
        trip,
        travellers,
        match.ownerTraveller?.id ?? defaultOwner?.id,
        db,
      ),
    ),
  );

  const templateResults = templates.map((preview) => ({
    ...preview,
    reason: `Suggested by ${preview.template.name} template.`,
  }));
  const bundleResults = bundles.map((preview) => ({
    ...preview,
    reason: `Suggested by ${preview.bundle.name}.`,
  }));
  const suggestedNames = new Set([
    ...templateResults.flatMap((preview) =>
      preview.suggestions.map((suggestion) => normaliseName(suggestion.templateItem.name)),
    ),
    ...relevantExtras.map(({ extra }) => normaliseName(extra.name)),
    ...bundleResults.flatMap((preview) =>
      preview.suggestions.map((suggestion) => normaliseName(suggestion.bundleItem.name)),
    ),
  ]);
  const alreadyIncluded = existingItems.filter(
    (item) => !item.archivedAt && suggestedNames.has(normaliseName(item.name)),
  );

  return {
    trip,
    travellers: tripTravellers,
    templates: templateResults,
    usefulExtras: relevantExtras,
    gadgetBundles: bundleResults,
    alreadyIncluded,
    newSuggestionCount:
      templateResults.reduce((total, preview) => total + preview.newCount, 0) +
      relevantExtras.filter(({ status }) => status === "new").length +
      bundleResults.reduce(
        (total, preview) =>
          total + preview.suggestions.filter(({ status }) => status === "new").length,
        0,
      ),
    duplicateCount:
      templateResults.reduce((total, preview) => total + preview.duplicateCount, 0) +
      relevantExtras.filter(({ status }) => status === "duplicate").length +
      bundleResults.reduce((total, preview) => total + preview.duplicateCount, 0),
  };
}

export async function applyStarterPack(
  input: ApplyStarterPackInput,
  db: ProperlyPackedDatabase = appDb,
): Promise<ApplyStarterPackResult> {
  // Each source rebuilds its preview immediately before writing. Counts can differ
  // from the earlier combined preview when another selected source adds an
  // overlapping item first; this mutation-time check is the final safety gate.
  let itemsAdded = 0;
  let tasksCreated = 0;
  let duplicatesSkipped = 0;

  for (const templateId of input.templateIds ?? []) {
    const result = await applyTemplateToTrip(templateId, input.trip, input.travellers, db);
    itemsAdded += result.inserted;
    duplicatesSkipped += result.skippedDuplicates;
  }
  for (const extraId of input.usefulExtraIds ?? []) {
    const result = await addUsefulExtraToTrip(extraId, input.trip, input.travellers, db);
    if (result.inserted) itemsAdded += 1;
    else duplicatesSkipped += 1;
  }
  for (const bundle of input.gadgetBundles ?? []) {
    const result = await applyGadgetBundleToTrip(
      {
        bundleId: bundle.bundleId,
        trip: input.trip,
        travellers: input.travellers,
        ownerTravellerId: bundle.ownerTravellerId,
        optionalItemIds: bundle.optionalItemIds,
      },
      db,
    );
    itemsAdded += result.insertedItems;
    tasksCreated += result.createdTasks;
    duplicatesSkipped += result.skippedDuplicates;
  }

  return {
    itemsAdded,
    tasksCreated,
    duplicatesSkipped,
    summary: starterPackSummary(itemsAdded, duplicatesSkipped, tasksCreated),
  };
}

export function starterPackSummary(
  itemsAdded: number,
  duplicatesSkipped: number,
  tasksCreated: number,
) {
  if (itemsAdded === 0) {
    return duplicatesSkipped > 0
      ? "No new items were added because everything selected is already present."
      : "No suggestions were selected.";
  }
  const parts = [
    `${itemsAdded} ${itemsAdded === 1 ? "item" : "items"} added`,
    `${duplicatesSkipped} ${duplicatesSkipped === 1 ? "duplicate" : "duplicates"} skipped`,
  ];
  if (tasksCreated > 0) {
    parts.push(`${tasksCreated} ${tasksCreated === 1 ? "task" : "tasks"} created`);
  }
  return `${parts.join(". ")}.`;
}

function extraReason(
  suggestion: UsefulExtraSuggestion,
  trip: Trip,
  travellers: Traveller[],
  contextOptions: ContextOption[],
) {
  if (suggestion.extra.category === "pet") {
    const dog = travellers.find((traveller) => traveller.travellerType === "dog");
    return dog
      ? `Suggested because ${dog.name} is included.`
      : "Useful extra for a dog-friendly stay.";
  }
  if (suggestion.extra.applicableContexts.includes("kids")) {
    const child = travellers.find((traveller) => traveller.travellerType === "child");
    if (child) return `Suggested because ${child.name} is travelling.`;
  }
  const context = suggestion.extra.applicableContexts.find((value) =>
    tripMatchesContext(trip, value, contextOptions),
  );
  return context
    ? `Useful extra for ${context.replace(/-/g, " ")}.`
    : `Useful extra for ${trip.tripType.replace(/-/g, " ")}.`;
}

function normaliseName(name: string) {
  return name.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}
