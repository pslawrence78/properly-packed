import type { ProperlyPackedDatabase } from "../schema";
import { appDb } from "../schema";
import type {
  PackingItem,
  PackingItemSource,
  PackingPriority,
  PackingStatus,
} from "../types";

export type PackingItemInput = {
  tripId: string;
  name: string;
  ownerTravellerId: string;
  responsibleTravellerId?: string;
  category: string;
  quantity: number;
  priority: PackingPriority;
  status: PackingStatus;
  bagId?: string;
  notes?: string;
};

export async function listPackingItemsForTrip(
  tripId: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const items = await db.packingItems.where("tripId").equals(tripId).toArray();
  return items
    .filter((item) => !item.archivedAt)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPackingItem(
  id: string,
  db: ProperlyPackedDatabase = appDb,
) {
  return db.packingItems.get(id);
}

export async function createPackingItem(
  input: PackingItemInput,
  db: ProperlyPackedDatabase = appDb,
) {
  const now = new Date().toISOString();
  const item: PackingItem = {
    id: createId("packing-item"),
    ...input,
    quantity: Math.max(1, input.quantity),
    flags: [],
    dependencyItemIds: [],
    source: "manual" satisfies PackingItemSource,
    forgottenRisk: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.packingItems.add(item);
  return item;
}

export async function updatePackingItem(
  id: string,
  updates: Partial<PackingItemInput>,
  db: ProperlyPackedDatabase = appDb,
) {
  await db.packingItems.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  return getPackingItem(id, db);
}

export async function updatePackingItemStatus(
  id: string,
  status: PackingStatus,
  db: ProperlyPackedDatabase = appDb,
) {
  return updatePackingItem(id, { status }, db);
}

export async function archivePackingItem(
  id: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const now = new Date().toISOString();
  await db.packingItems.update(id, {
    archivedAt: now,
    updatedAt: now,
  });
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }

  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
