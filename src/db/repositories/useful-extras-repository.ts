import type { ProperlyPackedDatabase } from "../schema";
import { appDb } from "../schema";
import { tripMatchesContext } from "../trip-context-matching";
import type { ContextOption, PackingItem, Traveller, Trip, UsefulExtra } from "../types";
import { hasDuplicatePackingItem } from "./templates-repository";

export type UsefulExtraSuggestion = {
  extra: UsefulExtra;
  status: "new" | "duplicate" | "hidden";
};

export type AddUsefulExtraResult = {
  inserted: boolean;
  reason?: string;
};

export async function listUsefulExtras(db: ProperlyPackedDatabase = appDb) {
  const extras = await db.usefulExtras.toArray();
  return extras
    .filter((extra) => !extra.archivedAt)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listUsefulExtraSuggestionsForTrip(
  trip: Trip,
  travellers: Traveller[],
  db: ProperlyPackedDatabase = appDb,
) {
  const [extras, existingItems, contextOptions] = await Promise.all([
    listUsefulExtras(db),
    db.packingItems.where("tripId").equals(trip.id).toArray(),
    db.contextOptions.toArray(),
  ]);
  return extras
    .filter((extra) => extraAppliesToTrip(extra, trip, contextOptions))
    .map((extra): UsefulExtraSuggestion => {
      if (extra.neverSuggest && !extra.alwaysSuggest) {
        return { extra, status: "hidden" };
      }

      if (hasDuplicatePackingItem(existingItems, extra.name, "shared")) {
        return { extra, status: "duplicate" };
      }

      return { extra, status: "new" };
    })
    .sort(
      (a, b) =>
        Number(b.extra.alwaysSuggest) - Number(a.extra.alwaysSuggest) ||
        Number(b.extra.forgottenBefore) - Number(a.extra.forgottenBefore) ||
        a.extra.name.localeCompare(b.extra.name),
    );
}

export async function addUsefulExtraToTrip(
  extraId: string,
  trip: Trip,
  travellers: Traveller[],
  db: ProperlyPackedDatabase = appDb,
): Promise<AddUsefulExtraResult> {
  const extra = await db.usefulExtras.get(extraId);

  if (!extra) {
    throw new Error("Useful extra not found.");
  }

  const existingItems = await db.packingItems.where("tripId").equals(trip.id).toArray();

  if (hasDuplicatePackingItem(existingItems, extra.name, "shared")) {
    return { inserted: false, reason: "Already on this packing list." };
  }

  const now = new Date().toISOString();
  const item: PackingItem = {
    id: createId("packing-item"),
    tripId: trip.id,
    name: extra.name,
    ownershipScope: "shared",
    category: extra.category,
    quantity: 1,
    priority: extra.defaultPriority,
    status: "needed",
    flags: [],
    dependencyItemIds: [],
    source: "useful-extra",
    sourceId: extra.id,
    notes: "Added from Useful Extras.",
    forgottenRisk: extra.forgottenBefore,
    alwaysSuggest: extra.alwaysSuggest,
    neverSuggest: extra.neverSuggest,
    createdAt: now,
    updatedAt: now,
  };

  await db.packingItems.add(item);
  return { inserted: true };
}

export async function updateUsefulExtraFlags(
  extraId: string,
  updates: Partial<Pick<UsefulExtra, "alwaysSuggest" | "neverSuggest" | "forgottenBefore">>,
  db: ProperlyPackedDatabase = appDb,
) {
  const now = new Date().toISOString();
  await db.usefulExtras.update(extraId, {
    ...updates,
    updatedAt: now,
    userModifiedAt: now,
  });
  return db.usefulExtras.get(extraId);
}

export function extraAppliesToTrip(
  extra: UsefulExtra,
  trip: Trip,
  contextOptions: ContextOption[] = [],
) {
  if (extra.alwaysSuggest) {
    return true;
  }

  const tripTypeMatch =
    extra.applicableTripTypes.length === 0 ||
    extra.applicableTripTypes.includes(trip.tripType);
  const contextMatch =
    extra.applicableContexts.length === 0 ||
    extra.applicableContexts.some((context) =>
      tripMatchesContext(trip, context, contextOptions),
    );

  return tripTypeMatch && contextMatch;
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }

  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
