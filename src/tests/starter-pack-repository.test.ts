import { afterEach, describe, expect, it } from "vitest";
import { ProperlyPackedDatabase } from "../db";
import {
  applyStarterPack,
  previewStarterPack,
  starterPackSummary,
} from "../db/repositories/starter-pack-repository";
import { applyInitialSeed } from "../db/seed";
import type { Traveller, Trip, TripType } from "../db/types";

const testDatabases: ProperlyPackedDatabase[] = [];

function createTestDatabase() {
  const db = new ProperlyPackedDatabase(`properly-packed-test-${crypto.randomUUID()}`);
  testDatabases.push(db);
  return db;
}

afterEach(async () => {
  await Promise.all(testDatabases.splice(0).map(async (db) => {
    db.close();
    await db.delete();
  }));
});

describe("trip starter pack", () => {
  it("matches by trip type and ID-based accommodation, transport and activity contexts", async () => {
    const db = createTestDatabase();
    await applyInitialSeed(db, () => "2026-06-20T00:00:00.000Z");
    const travellers = [traveller("traveller:beck", "Beck", "adult")];
    const trip = tripRow("fly-cruise", travellers, {
      accommodationContextIds: ["seed:context-option:accommodation:cruise-cabin"],
      transportContextIds: ["seed:context-option:transport:flight"],
      activityContextIds: [
        "seed:context-option:activity:formal-night",
        "seed:context-option:activity:pool",
      ],
    });
    await db.travellers.bulkAdd(travellers);
    await db.trips.add(trip);

    const preview = await previewStarterPack(trip, travellers, db);

    expect(preview.templates.map(({ template }) => template.name)).toContain("Fly-cruise");
    expect(preview.usefulExtras.map(({ extra }) => extra.name)).toEqual(
      expect.arrayContaining(["Plane phone stand", "Cabin night light"]),
    );
    expect(preview.gadgetBundles.map(({ bundle }) => bundle.name)).toEqual(
      expect.arrayContaining(["Cruise cabin charging kit", "Headphones and audio kit"]),
    );
  });

  it("gates child and dog suggestions by selected travellers or dog-friendly context", async () => {
    const db = createTestDatabase();
    await applyInitialSeed(db);
    const adults = [traveller("traveller:phil", "Phil", "adult")];
    const seb = traveller("traveller:seb", "Seb", "child");
    const albert = traveller("traveller:albert", "Albert", "dog");
    await db.travellers.bulkAdd([...adults, seb, albert]);

    const adultPreview = await previewStarterPack(tripRow("staycation", adults), [...adults, seb, albert], db);
    expect(adultPreview.usefulExtras.some(({ reason }) => reason.includes("Seb"))).toBe(false);
    expect(adultPreview.usefulExtras.some(({ extra }) => extra.category === "pet")).toBe(false);

    const family = [...adults, seb, albert];
    const familyPreview = await previewStarterPack(tripRow("staycation", family), family, db);
    expect(familyPreview.usefulExtras.some(({ reason }) => reason.includes("Seb is travelling"))).toBe(true);
    expect(familyPreview.usefulExtras.some(({ reason }) => reason.includes("Albert is included"))).toBe(true);

    const dogFriendly = tripRow("staycation", adults, {
      activityContextIds: ["seed:context-option:activity:dog-friendly-stay"],
    });
    const contextPreview = await previewStarterPack(dogFriendly, adults, db);
    expect(contextPreview.usefulExtras.some(({ extra }) => extra.category === "pet")).toBe(true);
  });

  it("applies selected sources with tracking and remains idempotent", async () => {
    const db = createTestDatabase();
    await applyInitialSeed(db);
    const travellers = [traveller("traveller:beck", "Beck", "adult")];
    const trip = tripRow("theme-park", travellers, {
      activityContextIds: ["seed:context-option:activity:theme-park"],
    });
    await db.travellers.bulkAdd(travellers);
    await db.trips.add(trip);
    const preview = await previewStarterPack(trip, travellers, db);
    const template = preview.templates.find(({ template }) => template.name === "Disney or theme park")!;
    const extra = preview.usefulExtras.find(({ extra }) => extra.name === "Cooling towel")!;
    const bundle = preview.gadgetBundles.find(({ bundle }) => bundle.name === "Theme park battery kit")!;
    const input = {
      trip,
      travellers,
      templateIds: [template.template.id],
      usefulExtraIds: [extra.extra.id],
      gadgetBundles: [{ bundleId: bundle.bundle.id, ownerTravellerId: travellers[0].id }],
    };

    const first = await applyStarterPack(input, db);
    const second = await applyStarterPack(input, db);
    const items = await db.packingItems.where("tripId").equals(trip.id).toArray();

    expect(first.itemsAdded).toBeGreaterThan(0);
    expect(first.summary).toContain("items added");
    expect(new Set(items.map((item) => item.source))).toEqual(
      new Set(["template", "useful-extra", "gadget-bundle"]),
    );
    expect(items.every((item) => item.sourceId)).toBe(true);
    expect(second.itemsAdded).toBe(0);
    expect(second.duplicatesSkipped).toBeGreaterThan(0);
    expect(second.summary).toContain("already present");
    expect(await db.packingItems.where("tripId").equals(trip.id).count()).toBe(items.length);
  });

  it("formats clear application summaries", () => {
    expect(starterPackSummary(24, 6, 2)).toBe("24 items added. 6 duplicates skipped. 2 tasks created.");
    expect(starterPackSummary(0, 4, 0)).toContain("already present");
    expect(starterPackSummary(0, 0, 0)).toBe("No suggestions were selected.");
  });
});

function traveller(id: string, name: string, travellerType: Traveller["travellerType"]): Traveller {
  return { id, name, travellerType, defaultIncluded: true, createdAt: "2026-06-20", updatedAt: "2026-06-20" };
}

function tripRow(
  tripType: TripType,
  travellers: Traveller[],
  overrides: Partial<Trip> = {},
): Trip {
  return {
    id: `trip:${crypto.randomUUID()}`,
    name: "Starter pack trip",
    tripType,
    startDate: "2026-08-01",
    endDate: "2026-08-08",
    nights: 7,
    destinations: ["Somewhere"],
    climateContextIds: [],
    accommodationContextIds: [],
    transportContextIds: [],
    activityContextIds: [],
    travellerIds: travellers.map(({ id }) => id),
    status: "planning",
    createdAt: "2026-06-20",
    updatedAt: "2026-06-20",
    ...overrides,
  };
}
