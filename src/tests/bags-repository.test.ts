import { afterEach, describe, expect, it } from "vitest";
import { ProperlyPackedDatabase } from "../db";
import {
  archiveBag,
  createBag,
  createDefaultBagsForTrip,
  listBagsForTrip,
  updateBag,
} from "../db/repositories/bags-repository";
import { createPackingItem } from "../db/repositories/packing-items-repository";
import type { Traveller } from "../db/types";

const testDatabases: ProperlyPackedDatabase[] = [];

function createTestDatabase() {
  const db = new ProperlyPackedDatabase(`properly-packed-test-${crypto.randomUUID()}`);
  testDatabases.push(db);
  return db;
}

afterEach(async () => {
  await Promise.all(
    testDatabases.splice(0).map(async (db) => {
      db.close();
      await db.delete();
    }),
  );
});

const travellers: Traveller[] = [
  traveller("traveller:beck", "Beck"),
  traveller("traveller:phil", "Phil"),
  traveller("traveller:seb", "Seb"),
  traveller("traveller:shared", "Shared Family", "shared"),
];

describe("bags repository", () => {
  it("creates default bags once for a trip", async () => {
    const db = createTestDatabase();

    await createDefaultBagsForTrip("trip:1", travellers, db);
    await createDefaultBagsForTrip("trip:1", travellers, db);

    const bags = await listBagsForTrip("trip:1", db);
    expect(bags).toHaveLength(10);
    expect(bags.map((bag) => bag.name)).toContain("Travel day bag");
    expect(bags.some((bag) => bag.isCruiseEmbarkation)).toBe(true);
  });

  it("creates, updates and archives bags, unassigning related items", async () => {
    const db = createTestDatabase();
    const bag = await createBag(
      {
        tripId: "trip:1",
        name: "Camera cube",
        bagType: "camera-bag",
        isHandLuggage: true,
        isTravelDay: false,
        isCruiseEmbarkation: false,
      },
      db,
    );
    const item = await createPackingItem(
      {
        tripId: "trip:1",
        name: "Camera",
        ownerTravellerId: "traveller:phil",
        category: "electronics",
        quantity: 1,
        priority: "important",
        status: "needed",
        bagId: bag.id,
      },
      db,
    );

    await updateBag(bag.id, { name: "Camera bag" }, db);
    expect(await listBagsForTrip("trip:1", db)).toMatchObject([
      { name: "Camera bag" },
    ]);

    await archiveBag(bag.id, db);
    expect(await listBagsForTrip("trip:1", db)).toEqual([]);
    expect((await db.packingItems.get(item.id))?.bagId).toBeUndefined();
  });
});

function traveller(
  id: string,
  name: string,
  travellerType: Traveller["travellerType"] = "adult",
): Traveller {
  return {
    id,
    name,
    travellerType,
    defaultIncluded: true,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}
