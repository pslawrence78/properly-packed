import { afterEach, describe, expect, it } from "vitest";
import { ProperlyPackedDatabase } from "../db";
import {
  applyGadgetBundleToTrip,
  findMissingDependencies,
  listItemsToCharge,
  listItemsToDownload,
  previewGadgetBundleForTrip,
} from "../db/repositories/gadget-bundles-repository";
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

describe("gadget bundles repository", () => {
  it("applies required bundle items with source tracking and pre-trip tasks", async () => {
    const db = createTestDatabase();
    await applyInitialSeed(db, () => "2026-06-16T00:00:00.000Z");
    const travellers = [traveller("traveller:alex", "Alex")];
    await db.travellers.bulkAdd(travellers);
    const trip = tripRow(travellers.map((traveller) => traveller.id));
    const bundleId = "seed:gadget-bundle:camera-kit";
    await db.trips.add(trip);

    const preview = await previewGadgetBundleForTrip(bundleId, trip, travellers, db);
    expect(preview.requiredCount).toBe(4);
    expect(preview.optionalCount).toBe(1);

    const result = await applyGadgetBundleToTrip({ bundleId, trip, travellers }, db);
    const items = await db.packingItems.where("tripId").equals(trip.id).toArray();
    const tasks = await db.preTripTasks.where("tripId").equals(trip.id).toArray();

    expect(result).toMatchObject({ insertedItems: 4, createdTasks: 2 });
    expect(items.every((item) => item.source === "gadget-bundle")).toBe(true);
    expect(items.every((item) => item.sourceId)).toBe(true);
    expect(tasks.map((task) => task.taskType).sort()).toEqual(["charge", "charge"]);

    const secondResult = await applyGadgetBundleToTrip({ bundleId, trip, travellers }, db);
    expect(secondResult.insertedItems).toBe(0);
    expect(secondResult.skippedDuplicates).toBe(4);
  });

  it("includes selected optional items", async () => {
    const db = createTestDatabase();
    await applyInitialSeed(db, () => "2026-06-16T00:00:00.000Z");
    const travellers = [traveller("traveller:alex", "Alex")];
    await db.travellers.bulkAdd(travellers);
    const trip = tripRow(travellers.map((traveller) => traveller.id));
    await db.trips.add(trip);

    await applyGadgetBundleToTrip(
      {
        bundleId: "seed:gadget-bundle:camera-kit",
        trip,
        travellers,
        optionalItemIds: ["seed:gadget-bundle-item:camera:lens-cloth"],
      },
      db,
    );

    expect((await db.packingItems.toArray()).map((item) => item.name)).toContain(
      "Lens cloth",
    );
  });

  it("detects missing dependencies and charge/download filters", () => {
    const items: PackingItem[] = [
      packingItem("item:1", "Mobile hotspot", "to-charge", ["device"], "Needs charging cable."),
      packingItem("item:2", "Offline maps", "to-download", ["download"]),
      packingItem("item:3", "Camera battery", "needed", ["battery"], "Needs camera charger."),
      packingItem("item:4", "Camera charger", "needed", ["charger"]),
    ];

    expect(listItemsToCharge(items).map((item) => item.name)).toEqual([
      "Mobile hotspot",
      "Camera battery",
    ]);
    expect(listItemsToDownload(items).map((item) => item.name)).toEqual([
      "Offline maps",
    ]);
    expect(findMissingDependencies(items)).toMatchObject([
      { item: { name: "Mobile hotspot" }, dependencyNotes: "Needs charging cable." },
    ]);
  });
});

function tripRow(travellerIds: string[]): Trip {
  return {
    id: "trip:gadgets",
    name: "Gadget test trip",
    tripType: "cruise",
    startDate: "2026-08-01",
    endDate: "2026-08-08",
    nights: 7,
    destinations: ["Southampton"],
    accommodationTypes: ["ship"],
    transportModes: ["ship"],
    activityContexts: ["photography", "gadgets", "cruise"],
    travellerIds,
    status: "planning",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

function packingItem(
  id: string,
  name: string,
  status: PackingItem["status"],
  flags: string[],
  notes?: string,
): PackingItem {
  return {
    id,
    tripId: "trip:1",
    name,
    ownershipScope: "traveller",
    ownerTravellerId: "traveller:phil",
    category: "electronics",
    quantity: 1,
    priority: "important",
    status,
    flags,
    dependencyItemIds: [],
    source: "gadget-bundle",
    notes,
    forgottenRisk: false,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

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
