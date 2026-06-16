import type { ProperlyPackedDatabase } from "../schema";
import { appDb } from "../schema";
import type {
  Outfit,
  OutfitItem,
  OutfitItemType,
  OutfitStatus,
  OutfitType,
} from "../types";

export type OutfitInput = {
  tripId: string;
  ownerTravellerId: string;
  name: string;
  outfitType: OutfitType;
  plannedForDay?: number;
  plannedForDate?: string;
  activityContext?: string;
  status: OutfitStatus;
  rewearEligible: boolean;
  rewearCount?: number;
  notes?: string;
};

export type OutfitItemInput = {
  outfitId: string;
  packingItemId?: string;
  name: string;
  itemType: OutfitItemType;
  status: OutfitItem["status"];
  notes?: string;
};

export async function listOutfitsForTrip(
  tripId: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const outfits = await db.outfits.where("tripId").equals(tripId).toArray();
  return outfits.sort((a, b) => {
    const daySort = (a.plannedForDay ?? 999) - (b.plannedForDay ?? 999);
    return daySort || a.name.localeCompare(b.name);
  });
}

export async function listOutfitItemsForTrip(
  tripId: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const outfits = await listOutfitsForTrip(tripId, db);
  const outfitIds = new Set(outfits.map((outfit) => outfit.id));
  const items = await db.outfitItems.toArray();

  return items
    .filter((item) => outfitIds.has(item.outfitId))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getOutfit(
  id: string,
  db: ProperlyPackedDatabase = appDb,
) {
  return db.outfits.get(id);
}

export async function createOutfit(
  input: OutfitInput,
  db: ProperlyPackedDatabase = appDb,
) {
  const now = new Date().toISOString();
  const outfit: Outfit = {
    id: createId("outfit"),
    ...normaliseOutfitInput(input),
    createdAt: now,
    updatedAt: now,
  };

  await db.outfits.add(outfit);
  return outfit;
}

export async function updateOutfit(
  id: string,
  updates: Partial<OutfitInput>,
  db: ProperlyPackedDatabase = appDb,
) {
  await db.outfits.update(id, {
    ...normaliseOutfitInput(updates),
    updatedAt: new Date().toISOString(),
  });
  return getOutfit(id, db);
}

export async function deleteOutfit(
  id: string,
  db: ProperlyPackedDatabase = appDb,
) {
  await db.transaction("rw", [db.outfits, db.outfitItems], async () => {
    await db.outfitItems.where("outfitId").equals(id).delete();
    await db.outfits.delete(id);
  });
}

export async function createOutfitItem(
  input: OutfitItemInput,
  db: ProperlyPackedDatabase = appDb,
) {
  const now = new Date().toISOString();
  const item: OutfitItem = {
    id: createId("outfit-item"),
    ...normaliseOutfitItemInput(input),
    createdAt: now,
    updatedAt: now,
  };

  await db.outfitItems.add(item);
  return item;
}

export async function updateOutfitItem(
  id: string,
  updates: Partial<OutfitItemInput>,
  db: ProperlyPackedDatabase = appDb,
) {
  await db.outfitItems.update(id, {
    ...normaliseOutfitItemInput(updates),
    updatedAt: new Date().toISOString(),
  });
  return db.outfitItems.get(id);
}

export async function deleteOutfitItem(
  id: string,
  db: ProperlyPackedDatabase = appDb,
) {
  await db.outfitItems.delete(id);
}

function normaliseOutfitInput<T extends Partial<OutfitInput>>(input: T): T {
  const normalised: Partial<OutfitInput> = { ...input };

  if ("name" in input) {
    normalised.name = input.name?.trim();
  }

  if ("activityContext" in input) {
    normalised.activityContext = input.activityContext?.trim() || undefined;
  }

  if ("notes" in input) {
    normalised.notes = input.notes?.trim() || undefined;
  }

  if ("plannedForDate" in input) {
    normalised.plannedForDate = input.plannedForDate?.trim() || undefined;
  }

  if ("plannedForDay" in input) {
    normalised.plannedForDay =
      typeof input.plannedForDay === "number" && input.plannedForDay > 0
        ? input.plannedForDay
        : undefined;
  }

  if ("rewearCount" in input) {
    normalised.rewearCount =
      typeof input.rewearCount === "number" && input.rewearCount > 0
        ? input.rewearCount
        : undefined;
  }

  return normalised as T;
}

function normaliseOutfitItemInput<T extends Partial<OutfitItemInput>>(input: T): T {
  const normalised: Partial<OutfitItemInput> = { ...input };

  if ("name" in input) {
    normalised.name = input.name?.trim();
  }

  if ("notes" in input) {
    normalised.notes = input.notes?.trim() || undefined;
  }

  if ("packingItemId" in input) {
    normalised.packingItemId = input.packingItemId?.trim() || undefined;
  }

  return normalised as T;
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }

  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
