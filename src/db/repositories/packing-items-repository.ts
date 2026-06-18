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
  const validated = await validatePackingItemInput(input, db);
  const now = new Date().toISOString();
  const ownership = normaliseOwnership(validated);
  const item: PackingItem = {
    id: createId("packing-item"),
    ...validated,
    ...ownership,
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
  const existing = await getPackingItem(id, db);
  if (!existing) {
    throw new Error("Packing item not found.");
  }
  const validated = await validatePackingItemInput(
    {
      tripId: updates.tripId ?? existing.tripId,
      name: updates.name ?? existing.name,
      ownershipScope: updates.ownershipScope ?? existing.ownershipScope,
      ownerTravellerId:
        "ownerTravellerId" in updates
          ? updates.ownerTravellerId
          : existing.ownerTravellerId,
      responsibleTravellerId:
        "responsibleTravellerId" in updates
          ? updates.responsibleTravellerId
          : existing.responsibleTravellerId,
      category: updates.category ?? existing.category,
      quantity: updates.quantity ?? existing.quantity,
      priority: updates.priority ?? existing.priority,
      status: updates.status ?? existing.status,
      bagId: "bagId" in updates ? updates.bagId : existing.bagId,
      notes: "notes" in updates ? updates.notes : existing.notes,
    },
    db,
  );
  const ownershipUpdates = normaliseOwnership(validated);

  await db.packingItems.update(id, {
    ...validated,
    ...ownershipUpdates,
    updatedAt: new Date().toISOString(),
  });

  return getPackingItem(id, db);
}

export async function validatePackingItemInput(
  input: PackingItemInput,
  db: ProperlyPackedDatabase = appDb,
): Promise<PackingItemInput> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Enter an item name.");
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new Error("Quantity must be at least 1.");
  }

  if (input.ownershipScope === "traveller") {
    if (!input.ownerTravellerId) {
      throw new Error("Select a traveller, or choose Shared or Unassigned.");
    }
    if (!(await db.travellers.get(input.ownerTravellerId))) {
      throw new Error("The selected owner traveller no longer exists.");
    }
  }

  if (
    input.responsibleTravellerId &&
    !(await db.travellers.get(input.responsibleTravellerId))
  ) {
    throw new Error("The selected responsible traveller no longer exists.");
  }

  if (input.bagId) {
    const bag = await db.bags.get(input.bagId);
    if (!bag || bag.tripId !== input.tripId || bag.archivedAt) {
      throw new Error("The selected bag is not available for this trip.");
    }
  }

  return {
    ...input,
    name,
    ownerTravellerId:
      input.ownershipScope === "traveller" ? input.ownerTravellerId : undefined,
    category: input.category.trim() || "misc",
    notes: input.notes?.trim() || undefined,
  };
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
