import { afterEach, describe, expect, it } from "vitest";
import { ProperlyPackedDatabase } from "../db";
import {
  createOutfit,
  createOutfitItem,
  deleteOutfit,
  listOutfitItemsForTrip,
  listOutfitsForTrip,
  updateOutfit,
} from "../db/repositories/outfits-repository";

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

describe("outfits repository", () => {
  it("creates, updates and deletes outfits with their items", async () => {
    const db = createTestDatabase();
    const outfit = await createOutfit(
      {
        tripId: "trip:1",
        ownerTravellerId: "traveller:adult",
        name: "Day one outfit",
        outfitType: "day",
        plannedForDay: 1,
        status: "planned",
        rewearEligible: false,
      },
      db,
    );

    await createOutfitItem(
      {
        outfitId: outfit.id,
        name: "Sandals",
        itemType: "shoes",
        status: "needed",
      },
      db,
    );
    await updateOutfit(outfit.id, { status: "packed", rewearEligible: true }, db);

    expect(await listOutfitsForTrip("trip:1", db)).toMatchObject([
      { name: "Day one outfit", status: "packed", rewearEligible: true },
    ]);
    expect(await listOutfitItemsForTrip("trip:1", db)).toMatchObject([
      { name: "Sandals", itemType: "shoes" },
    ]);

    await deleteOutfit(outfit.id, db);

    expect(await listOutfitsForTrip("trip:1", db)).toEqual([]);
    expect(await db.outfitItems.count()).toBe(0);
  });
});
