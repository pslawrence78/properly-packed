import { afterEach, describe, expect, it } from "vitest";
import { ProperlyPackedDatabase } from "../db";
import {
  getTripDayCount,
  listItineraryDaysForTrip,
  saveItineraryDay,
  saveItineraryDays,
} from "../db/repositories/trip-itinerary-repository";
import type { Trip } from "../db/types";

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

describe("trip itinerary repository", () => {
  it("generates one itinerary row for every trip day", async () => {
    const db = createTestDatabase();
    const cruise = trip({
      startDate: "2026-08-14",
      endDate: "2026-08-30",
      nights: 16,
    });

    await db.trips.add(cruise);

    const days = await listItineraryDaysForTrip(cruise, db);

    expect(getTripDayCount(cruise)).toBe(17);
    expect(days).toHaveLength(17);
    expect(days[0]).toMatchObject({ dayNumber: 1, date: "2026-08-14" });
    expect(days[16]).toMatchObject({ dayNumber: 17, date: "2026-08-30" });
  });

  it("saves multi-value day contexts without stripping spaces or commas", async () => {
    const db = createTestDatabase();
    const cruise = trip({
      destinations: ["Rome, Italy", "Naples, Italy"],
      accommodationTypes: ["Hotel", "Cruise cabin"],
      transportModes: ["Airplane", "Cruise ship"],
      activityContexts: ["Sightseeing", "Beach"],
    });

    await db.trips.add(cruise);
    await saveItineraryDay(
      cruise,
      1,
      {
        title: "Arrival and sightseeing",
        destinationContexts: ["Rome, Italy"],
        climateContexts: ["warm"],
        accommodationContexts: ["Hotel"],
        transportContexts: ["Airplane"],
        activityContexts: ["Sightseeing", "Beach"],
        notes: "Land, transfer, explore.",
      },
      db,
    );

    const [dayOne] = await listItineraryDaysForTrip(cruise, db);

    expect(dayOne).toMatchObject({
      dayNumber: 1,
      title: "Arrival and sightseeing",
      destinationContexts: ["Rome, Italy"],
      climateContexts: ["warm"],
      accommodationContexts: ["Hotel"],
      transportContexts: ["Airplane"],
      activityContexts: ["Sightseeing", "Beach"],
      notes: "Land, transfer, explore.",
    });
  });

  it("keeps saved day contexts while recalculating dates from edited trip dates", async () => {
    const db = createTestDatabase();
    const originalTrip = trip({
      startDate: "2026-08-14",
      endDate: "2026-08-16",
      nights: 2,
    });
    const editedTrip = {
      ...originalTrip,
      startDate: "2026-08-15",
      endDate: "2026-08-17",
    };

    await db.trips.add(originalTrip);
    await saveItineraryDay(
      originalTrip,
      2,
      {
        destinationContexts: ["Naples, Italy"],
        climateContexts: [],
        accommodationContexts: ["Cruise cabin"],
        transportContexts: ["Cruise ship"],
        activityContexts: ["Beach", "Sightseeing"],
      },
      db,
    );

    const days = await listItineraryDaysForTrip(editedTrip, db);

    expect(days[1]).toMatchObject({
      dayNumber: 2,
      date: "2026-08-16",
      destinationContexts: ["Naples, Italy"],
      accommodationContexts: ["Cruise cabin"],
      transportContexts: ["Cruise ship"],
      activityContexts: ["Beach", "Sightseeing"],
    });
  });

  it("prevents obvious duplicate values when saving itinerary days", async () => {
    const db = createTestDatabase();
    const cruise = trip({});

    await db.trips.add(cruise);
    const [savedDay] = await saveItineraryDays(
      cruise,
      [
        {
          dayNumber: 1,
          destinationContexts: ["Rome, Italy", " rome, italy "],
          climateContexts: ["Warm", "warm"],
          accommodationContexts: [],
          transportContexts: [],
          activityContexts: ["City walking", "City   walking"],
        },
      ],
      db,
    );

    expect(savedDay.destinationContexts).toEqual(["Rome, Italy"]);
    expect(savedDay.climateContexts).toEqual(["Warm"]);
    expect(savedDay.activityContexts).toEqual(["City walking"]);
  });
});

function trip(overrides: Partial<Trip>): Trip {
  return {
    id: "trip:itinerary",
    name: "Eastern Mediterranean Cruise",
    tripType: "cruise",
    startDate: "2026-08-01",
    endDate: "2026-08-08",
    nights: 7,
    destinations: ["Southampton"],
    climateProfile: "warm",
    accommodationTypes: ["Cruise cabin"],
    transportModes: ["Cruise ship"],
    activityContexts: ["Sightseeing"],
    travellerIds: ["traveller:phil"],
    status: "planning",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
    ...overrides,
  };
}
