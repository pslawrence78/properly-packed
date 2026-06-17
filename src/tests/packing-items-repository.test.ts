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
});
