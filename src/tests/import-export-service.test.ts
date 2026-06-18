import { afterEach, describe, expect, it } from "vitest";
import { ProperlyPackedDatabase } from "../db";
import type { Traveller, Trip } from "../db/types";
import type { ProperlyPackedExport } from "../features/import-export";
import { APP_VERSION } from "../lib/app-version";
import {
  EXPORT_SCHEMA_VERSION,
  generateExportData,
  getDataSafetySummary,
  parseImportJson,
  replaceDataFromExport,
  recordSuccessfulExport,
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
    await db.travellers.add(traveller("traveller:adult", "Adult traveller"));
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
      appVersion: "0.20.0",
      databaseVersion: 4,
    });
    expect(exportData.appVersion).toBe(APP_VERSION);
    expect(parsed.tables.travellers).toHaveLength(1);
    expect(parsed.tables.trips).toHaveLength(1);
    expect(Object.keys(parsed.tables)).toEqual([
      "travellers",
      "contextOptions",
      "trips",
      "tripItineraryDays",
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
    expect(() => validateImportData({ hello: "world" })).toThrow(
      "not a Properly Packed export",
    );
    expect(() =>
      validateImportData({
        schemaVersion: "properly-packed-export-v99",
        tables: {},
      }),
    ).toThrow("newer export schema than this app supports");
  });

  it("rejects duplicate IDs before replacing data", async () => {
    const validExport = await generateExportData(createTestDatabase());
    const duplicate = traveller("traveller:duplicate", "Adult traveller");
    const invalid = {
      ...validExport,
      tables: { ...validExport.tables, travellers: [duplicate, duplicate] },
    };
    expect(() => validateImportData(invalid)).toThrow(
      "Table travellers contains duplicate id traveller:duplicate",
    );
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
    await sourceDb.contextOptions.add({
      id: "context:pool",
      type: "activity",
      label: "Pool",
      active: true,
      sortOrder: 0,
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });
    await sourceDb.trips.add({
      ...trip("trip:new", "Imported trip"),
      activityContextIds: ["context:pool"],
    });
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
      { id: "trip:new", name: "Imported trip", activityContextIds: ["context:pool"] },
    ]);
    expect(await targetDb.contextOptions.toArray()).toMatchObject([
      { id: "context:pool", label: "Pool" },
    ]);
  });

  it("round trips ownership, bags and generated source metadata", async () => {
    const sourceDb = createTestDatabase();
    const targetDb = createTestDatabase();
    const now = "2026-06-18T00:00:00.000Z";
    await sourceDb.travellers.add(traveller("traveller:adult", "Adult traveller"));
    await sourceDb.trips.add({
      ...trip("trip:safe", "Safe backup"),
      travellerIds: ["traveller:adult"],
    });
    await sourceDb.bags.add({
      id: "bag:main",
      tripId: "trip:safe",
      name: "Main suitcase",
      bagType: "suitcase",
      isHandLuggage: false,
      isTravelDay: false,
      isCruiseEmbarkation: false,
      createdAt: now,
      updatedAt: now,
    });
    await sourceDb.packingItems.bulkAdd([
      {
        id: "item:shared",
        tripId: "trip:safe",
        name: "Travel documents",
        ownershipScope: "shared",
        category: "documents",
        quantity: 1,
        priority: "essential",
        status: "needed",
        bagId: "bag:main",
        flags: [],
        dependencyItemIds: [],
        source: "template",
        sourceId: "template-item:documents",
        forgottenRisk: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "item:unassigned",
        tripId: "trip:safe",
        name: "Optional jacket",
        ownershipScope: "unassigned",
        category: "clothing",
        quantity: 1,
        priority: "useful",
        status: "to-decide",
        flags: [],
        dependencyItemIds: [],
        source: "manual",
        forgottenRisk: false,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await replaceDataFromExport(await generateExportData(sourceDb), targetDb);
    expect(await targetDb.bags.get("bag:main")).toMatchObject({ name: "Main suitcase" });
    expect(await targetDb.packingItems.get("item:shared")).toMatchObject({
      ownershipScope: "shared",
      bagId: "bag:main",
      source: "template",
      sourceId: "template-item:documents",
    });
    expect(await targetDb.packingItems.get("item:unassigned")).toMatchObject({
      ownershipScope: "unassigned",
    });
    expect(await targetDb.packingItems.get("item:unassigned")).not.toHaveProperty("bagId");
  });

  it("reports data safety counts and persists the last successful export", async () => {
    const db = createTestDatabase();
    await db.travellers.add(traveller("traveller:adult", "Adult traveller"));
    await db.trips.add({
      ...trip("trip:summary", "Summary trip"),
      travellerIds: ["traveller:adult"],
    });
    await recordSuccessfulExport("2026-06-18T12:00:00.000Z", db);

    await expect(getDataSafetySummary(db)).resolves.toMatchObject({
      travellers: 1,
      trips: 1,
      packingItems: 0,
      bags: 0,
      lastExportedAt: "2026-06-18T12:00:00.000Z",
    });
  });

  it("rejects malformed context options and orphan trip context IDs", async () => {
    const validExport = await generateExportData(createTestDatabase());
    const malformed = {
      ...validExport,
      tables: {
        ...validExport.tables,
        contextOptions: [{ id: "bad", type: "weather", label: "Wet" }],
      },
    };
    expect(() => validateImportData(malformed)).toThrow("Context option type is invalid");

    const orphaned = {
      ...validExport,
      tables: {
        ...validExport.tables,
        trips: [{ ...trip("trip:orphan", "Orphan"), activityContextIds: ["missing"] }],
      },
    };
    expect(() => validateImportData(orphaned)).toThrow("invalid activity context ID");
  });

  it("accepts older exports that do not include itinerary days", async () => {
    const sourceDb = createTestDatabase();
    const targetDb = createTestDatabase();
    await sourceDb.travellers.add(traveller("traveller:new", "New"));
    await sourceDb.trips.add(trip("trip:new", "Imported trip"));

    const exportData = await generateExportData(
      sourceDb,
      () => "2026-06-16T12:00:00.000Z",
    );
    const olderExport = {
      ...exportData,
      tables: { ...exportData.tables },
    };
    delete (olderExport.tables as Partial<typeof olderExport.tables>)
      .tripItineraryDays;
    delete (olderExport.tables as Partial<typeof olderExport.tables>)
      .contextOptions;
    olderExport.tables.trips = olderExport.tables.trips.map((sourceTrip) => {
      const {
        climateContextIds: _climateContextIds,
        accommodationContextIds: _accommodationContextIds,
        transportContextIds: _transportContextIds,
        activityContextIds: _activityContextIds,
        ...legacyTrip
      } = sourceTrip;
      return legacyTrip as Trip;
    });
    Object.assign(olderExport, { schemaVersion: "properly-packed-export-v1" });

    const validated = validateImportData(olderExport);

    expect(validated.tables.tripItineraryDays).toEqual([]);
    expect(validated.tables.contextOptions.length).toBeGreaterThan(0);

    await replaceDataFromExport(validated, targetDb);

    expect(await targetDb.trips.toArray()).toMatchObject([
      { id: "trip:new", name: "Imported trip" },
    ]);
    expect(await targetDb.tripItineraryDays.count()).toBe(0);
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
    expect(await db.travellers.count()).toBe(0);
    expect(await db.templates.count()).toBeGreaterThan(0);
    expect(await db.appSettings.get("seedVersion")).toBeDefined();
  });

  it("normalises legacy Shared Family ownership on import", async () => {
    const exportData = await generateExportData(
      createTestDatabase(),
      () => "2026-06-16T12:00:00.000Z",
    );
    const legacyExport = {
      ...exportData,
      tables: {
        ...exportData.tables,
        travellers: [
          traveller("traveller:alex", "Alex"),
          {
            ...traveller("traveller:shared-family", "Shared Family"),
            travellerType: "shared",
            seedKey: "traveller:shared-family",
          },
        ],
        trips: [
          {
            ...trip("trip:legacy", "Legacy trip"),
            travellerIds: ["traveller:alex", "traveller:shared-family"],
          },
        ],
        packingItems: [
          {
            id: "packing-item:legacy",
            tripId: "trip:legacy",
            name: "Passports",
            ownerTravellerId: "traveller:shared-family",
            category: "documents",
            quantity: 1,
            priority: "essential",
            status: "needed",
            flags: [],
            dependencyItemIds: [],
            source: "manual",
            forgottenRisk: false,
            createdAt: "2026-06-16T00:00:00.000Z",
            updatedAt: "2026-06-16T00:00:00.000Z",
          },
        ],
        bags: [
          {
            id: "bag:legacy",
            tripId: "trip:legacy",
            name: "Shared suitcase",
            bagType: "suitcase",
            ownerTravellerId: "traveller:shared-family",
            isHandLuggage: false,
            isTravelDay: false,
            isCruiseEmbarkation: false,
            createdAt: "2026-06-16T00:00:00.000Z",
            updatedAt: "2026-06-16T00:00:00.000Z",
          },
        ],
      },
    };

    const validated = validateImportData(legacyExport);

    expect(validated.tables.travellers).toMatchObject([{ id: "traveller:alex" }]);
    expect(validated.tables.trips[0].travellerIds).toEqual(["traveller:alex"]);
    expect(validated.tables.packingItems[0]).toMatchObject({
      ownershipScope: "shared",
    });
    expect(validated.tables.packingItems[0].ownerTravellerId).toBeUndefined();
    expect(validated.tables.bags[0].ownerTravellerId).toBeUndefined();
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
    climateContextIds: [],
    accommodationContextIds: [],
    transportContextIds: [],
    activityContextIds: [],
    accommodationTypes: ["ship"],
    transportModes: ["ship"],
    activityContexts: ["formal-night"],
    travellerIds: ["traveller:adult"],
    status: "planning",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}
