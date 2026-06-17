import { afterEach, describe, expect, it } from "vitest";
import { ProperlyPackedDatabase } from "../db";
import { getDatabaseStatus } from "../db/repositories/app-settings-repository";
import { listTravellers } from "../db/repositories/travellers-repository";
import { applyInitialSeed } from "../db/seed";

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

describe("initial seed loader", () => {
  it("loads family travellers and app settings once", async () => {
    const db = createTestDatabase();
    const firstSeed = await applyInitialSeed(db, () => "2026-06-16T00:00:00.000Z");
    const secondSeed = await applyInitialSeed(db, () => "2026-06-17T00:00:00.000Z");
    const travellers = await listTravellers(db);
    const status = await getDatabaseStatus(db);

    expect(firstSeed).toMatchObject({
      applied: true,
      seedVersion: "0.8.0",
      travellersInserted: 5,
      templatesInserted: 9,
      usefulExtrasInserted: 15,
      gadgetBundlesInserted: 8,
    });
    expect(secondSeed).toMatchObject({
      applied: false,
      seedVersion: "0.8.0",
      travellersInserted: 0,
      templatesInserted: 9,
      usefulExtrasInserted: 15,
      gadgetBundlesInserted: 8,
    });
    expect(travellers.map((traveller) => traveller.name)).toEqual([
      "Albert",
      "Beck",
      "Phil",
      "Seb",
      "Shared Family",
    ]);
    expect(status).toMatchObject({
      databaseVersion: 2,
      seedVersion: "0.8.0",
      travellerCount: 5,
      defaultTravellerCount: 4,
      categoryCount: 13,
      bagTypeCount: 10,
    });
    expect(await db.auditEvents.count()).toBe(1);
    expect(await db.templates.count()).toBe(9);
    expect(await db.usefulExtras.count()).toBe(15);
    expect(await db.gadgetBundles.count()).toBe(8);
    expect(await db.gadgetBundleItems.count()).toBe(34);
  });
});
