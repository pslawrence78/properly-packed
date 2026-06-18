import { afterEach, describe, expect, it } from "vitest";
import { ProperlyPackedDatabase } from "../db";
import {
  archivePackingItem,
  createPackingItem,
  listPackingItemsForTrip,
  updatePackingItem,
  updatePackingItemStatus,
} from "../db/repositories/packing-items-repository";

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

describe("packing items repository", () => {
  it("can create, update status, edit and archive items", async () => {
    const db = createTestDatabase();
    await db.travellers.add({
      id: "traveller:phil",
      name: "Phil",
      travellerType: "adult",
      defaultIncluded: true,
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });
    const created = await createPackingItem(
      {
        tripId: "trip:1",
        name: "Passport",
        ownershipScope: "traveller",
        ownerTravellerId: "traveller:phil",
        category: "documents",
        quantity: 1,
        priority: "essential",
        status: "needed",
      },
      db,
    );

    await updatePackingItemStatus(created.id, "packed", db);
    await updatePackingItem(created.id, { notes: "In travel wallet" }, db);
    expect(await listPackingItemsForTrip("trip:1", db)).toMatchObject([
      { name: "Passport", status: "packed", notes: "In travel wallet" },
    ]);

    await archivePackingItem(created.id, db);
    expect(await listPackingItemsForTrip("trip:1", db)).toEqual([]);
  });

  it("allows shared and unassigned items without an owner", async () => {
    const db = createTestDatabase();
    const base = {
      tripId: "trip:1",
      name: "Travel insurance",
      category: "documents",
      quantity: 1,
      priority: "important" as const,
      status: "needed" as const,
    };

    await expect(
      createPackingItem({ ...base, ownershipScope: "shared" }, db),
    ).resolves.toMatchObject({ ownershipScope: "shared", ownerTravellerId: undefined });
    await expect(
      createPackingItem({ ...base, name: "Mystery cable", ownershipScope: "unassigned" }, db),
    ).resolves.toMatchObject({ ownershipScope: "unassigned", ownerTravellerId: undefined });
  });

  it("rejects missing traveller ownership, blank names and invalid quantities", async () => {
    const db = createTestDatabase();
    const base = {
      tripId: "trip:1",
      name: "Passport",
      ownershipScope: "unassigned" as const,
      category: "documents",
      quantity: 1,
      priority: "essential" as const,
      status: "needed" as const,
    };

    await expect(
      createPackingItem({ ...base, ownershipScope: "traveller" }, db),
    ).rejects.toThrow("Select a traveller");
    await expect(createPackingItem({ ...base, name: "   " }, db)).rejects.toThrow(
      "Enter an item name.",
    );
    await expect(createPackingItem({ ...base, quantity: 0 }, db)).rejects.toThrow(
      "Quantity must be at least 1.",
    );
  });

  it("keeps responsibility independent from shared ownership", async () => {
    const db = createTestDatabase();
    await db.travellers.add({
      id: "traveller:phil",
      name: "Phil",
      travellerType: "adult",
      defaultIncluded: true,
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });

    await expect(
      createPackingItem(
        {
          tripId: "trip:1",
          name: "Travel insurance",
          ownershipScope: "shared",
          responsibleTravellerId: "traveller:phil",
          category: "documents",
          quantity: 1,
          priority: "important",
          status: "needed",
        },
        db,
      ),
    ).resolves.toMatchObject({
      ownershipScope: "shared",
      ownerTravellerId: undefined,
      responsibleTravellerId: "traveller:phil",
    });
  });
});
