import type { ProperlyPackedDatabase } from "../schema";
import { appDb } from "../schema";
import type {
  ItemOwnershipScope,
  PackingItem,
  PackingItemSource,
  PackingPriority,
  PackingStatus,
} from "../types";

export type PackingItemInput = {
  tripId: string;
  name: string;
  ownershipScope: ItemOwnershipScope;
  ownerTravellerId?: string;
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
  const ownership = normaliseOwnership(input);
  const item: PackingItem = {
    id: createId("packing-item"),
    ...input,
    ...ownership,
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
  const ownershipUpdates =
    updates.ownershipScope || "ownerTravellerId" in updates
      ? normaliseOwnership({
          ownershipScope:
            updates.ownershipScope ??
            (updates.ownerTravellerId ? "traveller" : "unassigned"),
          ownerTravellerId: updates.ownerTravellerId,
        })
      : {};

  await db.packingItems.update(id, {
    ...updates,
    ...ownershipUpdates,
    updatedAt: new Date().toISOString(),
  });

  return getPackingItem(id, db);
}

export function normaliseOwnership(input: {
  ownershipScope?: ItemOwnershipScope;
  ownerTravellerId?: string;
}) {
  if (input.ownershipScope === "traveller" && input.ownerTravellerId) {
    return {
      ownershipScope: "traveller" as const,
      ownerTravellerId: input.ownerTravellerId,
    };
  }

  const ownershipScope: ItemOwnershipScope =
    input.ownershipScope === "shared" ? "shared" : "unassigned";

  return { ownershipScope, ownerTravellerId: undefined };
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
