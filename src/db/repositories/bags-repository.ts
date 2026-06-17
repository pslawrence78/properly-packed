import type { ProperlyPackedDatabase } from "../schema";
import { appDb } from "../schema";
import type { Bag, BagType, Traveller } from "../types";

export type BagInput = {
  tripId: string;
  name: string;
  bagType: BagType;
  ownerTravellerId?: string;
  notes?: string;
  isHandLuggage: boolean;
  isTravelDay: boolean;
  isCruiseEmbarkation: boolean;
};

export async function listBagsForTrip(
  tripId: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const bags = await db.bags.where("tripId").equals(tripId).toArray();
  return bags
    .filter((bag) => !bag.archivedAt)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getBag(id: string, db: ProperlyPackedDatabase = appDb) {
  return db.bags.get(id);
}

export async function createBag(
  input: BagInput,
  db: ProperlyPackedDatabase = appDb,
) {
  const now = new Date().toISOString();
  const bag: Bag = {
    id: createId("bag"),
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  await db.bags.add(bag);
  return bag;
}

export async function updateBag(
  id: string,
  updates: Partial<BagInput>,
  db: ProperlyPackedDatabase = appDb,
) {
  await db.bags.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  return getBag(id, db);
}

export async function archiveBag(
  id: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const now = new Date().toISOString();
  await db.transaction("rw", db.bags, db.packingItems, async () => {
    await db.bags.update(id, {
      archivedAt: now,
      updatedAt: now,
    });

    const assignedItems = await db.packingItems.where("bagId").equals(id).toArray();
    await Promise.all(
      assignedItems.map((item) =>
        db.packingItems.update(item.id, {
          bagId: undefined,
          updatedAt: now,
        }),
      ),
    );
  });
}

export async function createDefaultBagsForTrip(
  tripId: string,
  _travellers: Traveller[] = [],
  db: ProperlyPackedDatabase = appDb,
) {
  const existingBags = await listBagsForTrip(tripId, db);

  if (existingBags.length > 0) {
    return existingBags;
  }

  const defaults: BagInput[] = [
    suitcase("Suitcase"),
    {
      tripId,
      name: "Cabin bag",
      bagType: "cabin-bag",
      isHandLuggage: true,
      isTravelDay: false,
      isCruiseEmbarkation: false,
    },
    {
      tripId,
      name: "Gadget bag",
      bagType: "camera-bag",
      isHandLuggage: true,
      isTravelDay: false,
      isCruiseEmbarkation: false,
    },
    {
      tripId,
      name: "Documents pouch",
      bagType: "pouch",
      isHandLuggage: true,
      isTravelDay: true,
      isCruiseEmbarkation: false,
    },
    {
      tripId,
      name: "Day bag",
      bagType: "day-bag",
      isHandLuggage: true,
      isTravelDay: true,
      isCruiseEmbarkation: false,
    },
    {
      tripId,
      name: "Embarkation bag",
      bagType: "day-bag",
      isHandLuggage: true,
      isTravelDay: true,
      isCruiseEmbarkation: true,
    },
    {
      tripId,
      name: "Car boot",
      bagType: "car-storage",
      isHandLuggage: false,
      isTravelDay: false,
      isCruiseEmbarkation: false,
    },
  ];

  const created = await Promise.all(defaults.map((bag) => createBag(bag, db)));
  return created.sort((a, b) => a.name.localeCompare(b.name));

  function suitcase(name: string, ownerTravellerId?: string): BagInput {
    return {
      tripId,
      name,
      ownerTravellerId,
      bagType: "suitcase",
      isHandLuggage: false,
      isTravelDay: false,
      isCruiseEmbarkation: false,
    };
  }
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }

  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
