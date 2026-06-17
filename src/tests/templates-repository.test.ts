import { afterEach, describe, expect, it } from "vitest";
import { ProperlyPackedDatabase } from "../db";
import {
  applyTemplateToTrip,
  hasDuplicatePackingItem,
  previewTemplatesForTrip,
  rulesApply,
} from "../db/repositories/templates-repository";
import { addUsefulExtraToTrip } from "../db/repositories/useful-extras-repository";
import { applyInitialSeed } from "../db/seed";
import type { PackingItem, Traveller, Trip } from "../db/types";

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

describe("templates repository", () => {
  it("matches template rules against trip context", () => {
    const trip = tripRow("trip:1", ["traveller:alex"], {
      activityContexts: ["formal-night"],
    });

    expect(
      rulesApply(
        [{ field: "activityContexts", operator: "includes", value: "formal-night" }],
        trip,
      ),
    ).toBe(true);
    expect(
      rulesApply(
        [{ field: "activityContexts", operator: "not-includes", value: "formal-night" }],
        trip,
      ),
    ).toBe(false);
  });

  it("detects duplicate suggestions by owner and normalised name", () => {
    const items: PackingItem[] = [
      packingItem("packing-item:1", "  Passports ", "shared"),
    ];

    expect(hasDuplicatePackingItem(items, "passports", "shared")).toBe(true);
    expect(
      hasDuplicatePackingItem(items, "passports", "traveller", "traveller:alex"),
    ).toBe(false);
  });

  it("previews and applies cruise templates with source tracking", async () => {
    const db = createTestDatabase();
    await applyInitialSeed(db, () => "2026-06-16T00:00:00.000Z");
    const travellers = [
      traveller("traveller:alex", "Alex", "adult"),
      traveller("traveller:riley", "Riley", "child"),
    ];
    await db.travellers.bulkAdd(travellers);
    const trip = tripRow("trip:cruise", travellers.map((traveller) => traveller.id));
    await db.trips.add(trip);

    const previews = await previewTemplatesForTrip(trip, travellers, db);
    const cruisePreview = previews.find((preview) => preview.template.name === "Cruise");

    expect(cruisePreview?.newCount).toBeGreaterThan(0);

    const result = await applyTemplateToTrip(
      cruisePreview!.template.id,
      trip,
      travellers,
      db,
    );
    const insertedItems = await db.packingItems.where("tripId").equals(trip.id).toArray();

    expect(result.inserted).toBe(cruisePreview?.newCount);
    expect(insertedItems[0]).toMatchObject({
      ownershipScope: expect.stringMatching(/shared|traveller/),
      source: "template",
      status: "needed",
    });
    expect(insertedItems.every((item) => item.sourceId)).toBe(true);

    const secondResult = await applyTemplateToTrip(
      cruisePreview!.template.id,
      trip,
      travellers,
      db,
    );

    expect(secondResult.inserted).toBe(0);
    expect(secondResult.skippedDuplicates).toBe(insertedItems.length);
  });

  it("adds useful extras to a trip with source tracking", async () => {
    const db = createTestDatabase();
    await applyInitialSeed(db, () => "2026-06-16T00:00:00.000Z");
    const travellers = [traveller("traveller:alex", "Alex", "adult")];
    await db.travellers.bulkAdd(travellers);
    const trip = tripRow("trip:fly-cruise", ["traveller:alex"], {
      tripType: "fly-cruise",
      transportModes: ["flight"],
    });
    const extra = await db.usefulExtras.get(
      "seed:useful-extra:plane-comfort:empty-water-bottle",
    );

    await db.trips.add(trip);
    const result = await addUsefulExtraToTrip(extra!.id, trip, travellers, db);
    const items = await db.packingItems.where("tripId").equals(trip.id).toArray();

    expect(result).toEqual({ inserted: true });
    expect(items).toMatchObject([
      {
        name: "Empty water bottle",
        ownershipScope: "shared",
        source: "useful-extra",
        sourceId: extra!.id,
        forgottenRisk: true,
      },
    ]);
  });
});

function tripRow(
  id: string,
  travellerIds: string[],
  overrides: Partial<Trip> = {},
): Trip {
  return {
    id,
    name: "Cruise test",
    tripType: "cruise",
    startDate: "2026-08-01",
    endDate: "2026-08-08",
    nights: 7,
    destinations: ["Southampton"],
    accommodationTypes: ["ship"],
    transportModes: ["ship"],
    activityContexts: ["formal-night", "pool"],
    travellerIds,
    status: "planning",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
    ...overrides,
  };
}

function packingItem(
  id: string,
  name: string,
  ownershipScope: PackingItem["ownershipScope"],
  ownerTravellerId?: Traveller["id"],
): PackingItem {
  return {
    id,
    tripId: "trip:1",
    name,
    ownershipScope,
    ownerTravellerId,
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
  };
}

function traveller(
  id: string,
  name: string,
  travellerType: Traveller["travellerType"],
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
