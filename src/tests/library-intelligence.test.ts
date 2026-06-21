import { afterEach, describe, expect, it } from "vitest";
import { ProperlyPackedDatabase } from "../db";
import { previewTemplateForTrip } from "../db/repositories/templates-repository";
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

describe("Tranche 31 library intelligence", () => {
  it("covers the family fly-cruise without dog or toddler leakage", async () => {
    const { db, travellers } = await seededFamily();
    const trip = tripRow("fly-cruise", travellers.slice(0, 3), {
      transportModes: ["flight", "cruise"],
      accommodationTypes: ["cruise-cabin"],
      activityContexts: ["formal-night", "excursion", "pool", "photography", "long-travel-day"],
    });
    const names = await previewNames("fly-cruise", trip, travellers, db);

    expect(names).toEqual(expect.arrayContaining([
      "Flight boarding passes",
      "Travel neck pillow",
      "Cruise embarkation bag",
      "Magnetic cabin hooks",
      "Formal evening shoes",
      "Child headphones",
      "Child bedtime comfort item",
      "Child swim goggles",
    ]));
    expect(names.some((name) => /dog|napp|dummy|pushchair/i.test(name))).toBe(false);
  });

  it("keeps beach, theme park, dog stay, and cold-weather suggestions relevant", async () => {
    const { db, travellers } = await seededFamily();
    const scenarios = [
      {
        template: "beach-holiday",
        trip: tripRow("beach-holiday", travellers.slice(0, 3), {
          transportModes: ["flight"],
          activityContexts: ["pool", "beach", "long-travel-day"],
        }),
        includes: ["Flight boarding passes", "After sun", "Swim goggles", "Child travel entertainment"],
        excludes: /cruise|dog/i,
      },
      {
        template: "theme-park",
        trip: tripRow("theme-park", travellers.slice(0, 3), {
          climateProfile: "hot",
          transportModes: ["walking-heavy"],
          activityContexts: ["theme-park", "photography"],
        }),
        includes: ["Theme park day bag", "Sun cream", "Portable cooling fan", "Phone or camera"],
        excludes: /cruise|formal|dog/i,
      },
      {
        template: "dog-friendly-uk",
        trip: tripRow("staycation", travellers, {
          climateProfile: "wet-rainy",
          transportModes: ["car"],
          activityContexts: ["dog-friendly-stay", "self-catering-meals", "hiking-countryside"],
        }),
        includes: ["Dog harness", "Dog car restraint", "Rain jackets", "Walking shoes"],
        excludes: /flight|cruise|airport/i,
      },
      {
        template: "cold-weather",
        trip: tripRow("cold-weather", travellers.slice(0, 3), {
          climateProfile: "snow-winter",
          transportModes: ["flight"],
          activityContexts: ["cold-weather-activities", "photography", "long-travel-day"],
        }),
        includes: ["Warm socks", "Neck warmer", "Waterproof outer layers", "Hand warmers", "Child warm mid-layer"],
        excludes: /beach toy|cruise|dog/i,
      },
    ] as const;

    for (const scenario of scenarios) {
      const names = await previewNames(scenario.template, scenario.trip, travellers, db);
      expect(names).toEqual(expect.arrayContaining([...scenario.includes]));
      expect(names.some((name) => scenario.excludes.test(name))).toBe(false);
    }
  });
});

async function seededFamily() {
  const db = createTestDatabase();
  await applyInitialSeed(db, () => "2026-06-21T00:00:00.000Z");
  const travellers = [
    traveller("adult:one", "Adult one", "adult"),
    traveller("adult:two", "Adult two", "adult"),
    traveller("child:one", "Child", "child"),
    traveller("dog:one", "Dog", "dog"),
  ];
  await db.travellers.bulkAdd(travellers);
  return { db, travellers };
}

async function previewNames(
  templateKey: string,
  trip: Trip,
  travellers: Traveller[],
  db: ProperlyPackedDatabase,
) {
  await db.trips.put(trip);
  const preview = await previewTemplateForTrip(
    `seed:template:${templateKey}`,
    trip,
    travellers,
    db,
  );
  return preview.suggestions
    .filter(({ status }) => status === "new")
    .map(({ templateItem }) => templateItem.name);
}

function tripRow(
  tripType: TripType,
  travellers: Traveller[],
  overrides: Partial<Trip>,
): Trip {
  return {
    id: `trip:${tripType}`,
    name: `${tripType} test`,
    tripType,
    startDate: "2026-08-01",
    endDate: "2026-08-08",
    nights: 7,
    destinations: ["Test destination"],
    climateContextIds: [],
    accommodationContextIds: [],
    transportContextIds: [],
    activityContextIds: [],
    accommodationTypes: [],
    transportModes: [],
    activityContexts: [],
    travellerIds: travellers.map(({ id }) => id),
    status: "planning",
    createdAt: "2026-06-21T00:00:00.000Z",
    updatedAt: "2026-06-21T00:00:00.000Z",
    ...overrides,
  };
}

function traveller(id: string, name: string, travellerType: Traveller["travellerType"]): Traveller {
  return {
    id,
    name,
    travellerType,
    defaultIncluded: true,
    createdAt: "2026-06-21T00:00:00.000Z",
    updatedAt: "2026-06-21T00:00:00.000Z",
  };
}
