import { afterEach, describe, expect, it } from "vitest";
import { ProperlyPackedDatabase } from "../db";
import { getDatabaseStatus } from "../db/repositories/app-settings-repository";
import { listTravellers } from "../db/repositories/travellers-repository";
import { applyInitialSeed } from "../db/seed";
import {
  seededGadgetBundleItems,
  seededGadgetBundles,
  seededTemplateItems,
  seededTemplates,
  seededUsefulExtras,
} from "../db/seed-data";

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
  it("loads neutral starter data and app settings once", async () => {
    const db = createTestDatabase();
    const firstSeed = await applyInitialSeed(db, () => "2026-06-16T00:00:00.000Z");
    const secondSeed = await applyInitialSeed(db, () => "2026-06-17T00:00:00.000Z");
    const travellers = await listTravellers(db);
    const status = await getDatabaseStatus(db);

    expect(firstSeed).toMatchObject({
      applied: true,
      seedVersion: "0.12.0",
      travellersInserted: 0,
      templatesInserted: 11,
      usefulExtrasInserted: 140,
      gadgetBundlesInserted: 19,
      contextOptionsInserted: 57,
    });
    expect(secondSeed).toMatchObject({
      applied: false,
      seedVersion: "0.12.0",
      travellersInserted: 0,
      templatesInserted: 11,
      usefulExtrasInserted: 140,
      gadgetBundlesInserted: 19,
      contextOptionsInserted: 0,
    });
    expect(travellers.map((traveller) => traveller.name)).toEqual([]);
    expect(status).toMatchObject({
      databaseVersion: 5,
      seedVersion: "0.12.0",
      travellerCount: 0,
      defaultTravellerCount: 0,
      categoryCount: 13,
      bagTypeCount: 10,
    });
    expect(await db.auditEvents.count()).toBe(1);
    expect(await db.templates.count()).toBe(11);
    expect(await db.templateItems.count()).toBe(142);
    expect(await db.usefulExtras.count()).toBe(140);
    expect(await db.gadgetBundles.count()).toBe(19);
    expect(await db.gadgetBundleItems.count()).toBe(120);
    expect(await db.contextOptions.count()).toBe(57);

    expect(await db.usefulExtras.get("seed:useful-extra:cruise:magnetic-hooks"))
      .toMatchObject({ name: "Magnetic cruise hooks", category: "cruise-extras" });
    expect(await db.gadgetBundles.get("seed:gadget-bundle:family-charging-station"))
      .toMatchObject({ name: "Family charging station" });
    expect(await db.templates.get("seed:template:fly-cruise"))
      .toMatchObject({ name: "Fly-cruise" });
  });

  it("preserves user-modified seed records while adding new seed content", async () => {
    const db = createTestDatabase();
    await applyInitialSeed(db, () => "2026-06-16T00:00:00.000Z");
    await db.usefulExtras.update("seed:useful-extra:plane-comfort:eye-mask", {
      name: "My preferred sleep mask",
      userModifiedAt: "2026-06-16T12:00:00.000Z",
    });

    await applyInitialSeed(db, () => "2026-06-17T00:00:00.000Z");

    expect(await db.usefulExtras.get("seed:useful-extra:plane-comfort:eye-mask"))
      .toMatchObject({
        name: "My preferred sleep mask",
        userModifiedAt: "2026-06-16T12:00:00.000Z",
      });
    expect(await db.usefulExtras.count()).toBe(140);
  });

  it("keeps the expanded seed library curated, unique, and age-appropriate", () => {
    expect(seededUsefulExtras.length).toBeGreaterThanOrEqual(120);
    expect(seededGadgetBundles.length).toBeGreaterThanOrEqual(15);

    for (const collection of [
      seededTemplates,
      seededTemplateItems,
      seededUsefulExtras,
      seededGadgetBundles,
      seededGadgetBundleItems,
    ]) {
      expect(new Set(collection.map(({ id }) => id)).size).toBe(collection.length);
      expect(new Set(collection.map(({ seedKey }) => seedKey)).size).toBe(collection.length);
      expect(collection.every(({ name }) => name.trim().length > 0 && !name.endsWith("?"))).toBe(true);
    }

    const ageStaleNames = /napp(?:y|ies)|dumm(?:y|ies)|changing mat|swim napp|pushchair|toddler cutlery/i;
    expect(seededTemplateItems.some(({ name }) => ageStaleNames.test(name))).toBe(false);
    expect(seededUsefulExtras.some(({ name }) => ageStaleNames.test(name))).toBe(false);

    const normalisedExtras = seededUsefulExtras.map((extra) =>
      [
        extra.name.trim().toLocaleLowerCase().replace(/\s+/g, " "),
        extra.category,
        [...extra.applicableTripTypes].sort().join(","),
        [...extra.applicableContexts].sort().join(","),
      ].join("|"),
    );
    expect(new Set(normalisedExtras).size).toBe(normalisedExtras.length);
  });
});
