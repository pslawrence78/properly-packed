import { afterEach, describe, expect, it } from "vitest";
import { ProperlyPackedDatabase } from "../db";
import {
  createTraveller,
  deleteTraveller,
  getTraveller,
  listDefaultTravellers,
  listTravellers,
  updateTraveller,
} from "../db/repositories/travellers-repository";

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

describe("travellers repository", () => {
  it("can create, read, update and delete travellers", async () => {
    const db = createTestDatabase();
    const created = await createTraveller(
      {
        name: "Test Traveller",
        travellerType: "adult",
        defaultIncluded: true,
      },
      db,
    );

    expect(await getTraveller(created.id, db)).toMatchObject({
      name: "Test Traveller",
      travellerType: "adult",
      defaultIncluded: true,
    });
    expect(await listDefaultTravellers(db)).toHaveLength(1);

    await updateTraveller(created.id, { name: "Updated Traveller" }, db);
    expect(await getTraveller(created.id, db)).toMatchObject({
      name: "Updated Traveller",
    });

    await deleteTraveller(created.id, db);
    expect(await listTravellers(db)).toEqual([]);
  });
});
