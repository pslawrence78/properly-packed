import type { ProperlyPackedDatabase } from "../schema";
import { appDb } from "../schema";
import type { PackingItem, Traveller, Trip, UsefulExtra } from "../types";
import { hasDuplicatePackingItem } from "./templates-repository";

export type UsefulExtraSuggestion = {
  extra: UsefulExtra;
  ownerTraveller?: Traveller;
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
  const [extras, existingItems] = await Promise.all([
    listUsefulExtras(db),
    db.packingItems.where("tripId").equals(trip.id).toArray(),
  ]);
  const ownerTraveller = resolveSharedOwner(trip, travellers);

  return extras
    .filter((extra) => extraAppliesToTrip(extra, trip))
    .map((extra): UsefulExtraSuggestion => {
      if (extra.neverSuggest && !extra.alwaysSuggest) {
        return { extra, ownerTraveller, status: "hidden" };
      }

      if (
        ownerTraveller &&
        hasDuplicatePackingItem(existingItems, extra.name, ownerTraveller.id)
      ) {
        return { extra, ownerTraveller, status: "duplicate" };
      }

      return { extra, ownerTraveller, status: ownerTraveller ? "new" : "hidden" };
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

  const ownerTraveller = resolveSharedOwner(trip, travellers);

  if (!ownerTraveller) {
    return { inserted: false, reason: "No shared traveller is on this trip." };
  }

  const existingItems = await db.packingItems.where("tripId").equals(trip.id).toArray();

  if (hasDuplicatePackingItem(existingItems, extra.name, ownerTraveller.id)) {
    return { inserted: false, reason: "Already on this packing list." };
  }

  const now = new Date().toISOString();
  const item: PackingItem = {
    id: createId("packing-item"),
    tripId: trip.id,
    name: extra.name,
    ownerTravellerId: ownerTraveller.id,
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

export function extraAppliesToTrip(extra: UsefulExtra, trip: Trip) {
  if (extra.alwaysSuggest) {
    return true;
  }

  const tripTypeMatch =
    extra.applicableTripTypes.length === 0 ||
    extra.applicableTripTypes.includes(trip.tripType);
  const contextMatch =
    extra.applicableContexts.length === 0 ||
    extra.applicableContexts.some((context) =>
      trip.activityContexts.includes(context) ||
      trip.accommodationTypes.includes(context) ||
      trip.transportModes.includes(context) ||
      trip.climateProfile === context,
    );

  return tripTypeMatch && contextMatch;
}

function resolveSharedOwner(trip: Trip, travellers: Traveller[]) {
  const tripTravellers = travellers.filter((traveller) =>
    trip.travellerIds.includes(traveller.id),
  );

  return (
    tripTravellers.find((traveller) => traveller.travellerType === "shared") ??
    tripTravellers.find((traveller) => traveller.travellerType === "adult") ??
    tripTravellers[0]
  );
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }

  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
