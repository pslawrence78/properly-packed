import { afterEach, describe, expect, it } from "vitest";
import { ProperlyPackedDatabase } from "../db";
import type { Traveller, Trip } from "../db/types";
import type { ProperlyPackedExport } from "../features/import-export";
import {
  EXPORT_SCHEMA_VERSION,
  generateExportData,
  parseImportJson,
  replaceDataFromExport,
  resetLocalData,
  stringifyExport,
  validateImportData,
} from "../features/import-export";

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

describe("import and export service", () => {
  it("generates a versioned JSON export with every table", async () => {
    const db = createTestDatabase();
    await db.travellers.add(traveller("traveller:phil", "Phil"));
    await db.trips.add(trip("trip:1", "Summer cruise"));

    const exportData = await generateExportData(
      db,
      () => "2026-06-16T12:00:00.000Z",
    );
    const json = stringifyExport(exportData);
    const parsed = parseImportJson(json);

    expect(exportData).toMatchObject({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: "2026-06-16T12:00:00.000Z",
      databaseVersion: 1,
    });
    expect(parsed.tables.travellers).toHaveLength(1);
    expect(parsed.tables.trips).toHaveLength(1);
    expect(Object.keys(parsed.tables)).toEqual([
      "travellers",
      "trips",
      "packingItems",
      "bags",
      "outfits",
      "outfitItems",
      "gadgetBundles",
      "gadgetBundleItems",
      "templates",
      "templateItems",
      "usefulExtras",
      "preTripTasks",
      "postTripReviews",
      "reviewLearnings",
      "appSettings",
      "auditEvents",
    ]);
  });

  it("rejects corrupt JSON and unsupported schema versions", () => {
    expect(() => parseImportJson("{")).toThrow("Import file is not valid JSON.");
    expect(() =>
      validateImportData({
        schemaVersion: "properly-packed-export-v99",
      }),
    ).toThrow("Unsupported export schema version.");
  });

  it("rejects invalid table payloads before replacing data", async () => {
    const db = createTestDatabase();
    await db.travellers.add(traveller("traveller:existing", "Existing"));

    const validExport = await generateExportData(
      createTestDatabase(),
      () => "2026-06-16T12:00:00.000Z",
    );
    const invalidExport = {
      ...validExport,
      tables: {
        ...validExport.tables,
        trips: "not-an-array",
      },
    } as unknown as ProperlyPackedExport;

    await expect(replaceDataFromExport(invalidExport, db)).rejects.toThrow(
      "Table trips must be an array.",
    );
    expect(await db.travellers.toArray()).toMatchObject([
      { id: "traveller:existing", name: "Existing" },
    ]);
  });

  it("replaces all local data from a valid export", async () => {
    const sourceDb = createTestDatabase();
    const targetDb = createTestDatabase();
    await sourceDb.travellers.add(traveller("traveller:new", "New"));
    await sourceDb.trips.add(trip("trip:new", "Imported trip"));
    await targetDb.travellers.add(traveller("traveller:old", "Old"));

    const exportData = await generateExportData(
      sourceDb,
      () => "2026-06-16T12:00:00.000Z",
    );

    await replaceDataFromExport(exportData, targetDb);

    expect(await targetDb.travellers.toArray()).toMatchObject([
      { id: "traveller:new", name: "New" },
    ]);
    expect(await targetDb.trips.toArray()).toMatchObject([
      { id: "trip:new", name: "Imported trip" },
    ]);
  });

  it("resets local data and restores foundation seed data", async () => {
    const db = createTestDatabase();
    await db.travellers.add(traveller("traveller:custom", "Custom"));
    await db.trips.add(trip("trip:old", "Old trip"));

    const result = await resetLocalData(
      db,
      () => "2026-06-16T12:00:00.000Z",
    );

    expect(result.applied).toBe(true);
    expect(await db.trips.count()).toBe(0);
    expect(await db.travellers.count()).toBeGreaterThan(0);
    expect(await db.templates.count()).toBeGreaterThan(0);
    expect(await db.appSettings.get("seedVersion")).toBeDefined();
  });
});

function traveller(id: string, name: string): Traveller {
  return {
    id,
    name,
    travellerType: "adult",
    defaultIncluded: true,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

function trip(id: string, name: string): Trip {
  return {
    id,
    name,
    tripType: "cruise",
    startDate: "2026-08-01",
    endDate: "2026-08-08",
    nights: 7,
    destinations: ["Southampton"],
    accommodationTypes: ["ship"],
    transportModes: ["ship"],
    activityContexts: ["formal-night"],
    travellerIds: ["traveller:phil"],
    status: "planning",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}
