import { afterEach, describe, expect, it } from "vitest";
import { ProperlyPackedDatabase } from "../db";
import {
  archiveTrip,
  createTrip,
  duplicateTripShell,
  getTrip,
  listTrips,
  updateTrip,
} from "../db/repositories/trips-repository";

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

describe("trips repository", () => {
  it("can create, read, update, duplicate and archive trips", async () => {
    const db = createTestDatabase();
    const created = await createTrip(
      {
        name: "Summer Cruise",
        tripType: "cruise",
        startDate: "2026-07-01",
        endDate: "2026-07-08",
        nights: 7,
        destinations: ["Lisbon"],
        climateContextIds: [],
        accommodationContextIds: [],
        transportContextIds: [],
        activityContextIds: [],
        travellerIds: ["seed:traveller:beck"],
        status: "draft",
        notes: "Balcony cabin.",
      },
      db,
    );

    expect(await getTrip(created.id, db)).toMatchObject({
      name: "Summer Cruise",
      nights: 7,
    });

    await updateTrip(created.id, { status: "planning" }, db);
    expect(await getTrip(created.id, db)).toMatchObject({ status: "planning" });

    const duplicated = await duplicateTripShell(created.id, db);
    expect(duplicated).toMatchObject({
      name: "Summer Cruise copy",
      status: "draft",
      travellerIds: ["seed:traveller:beck"],
    });

    await archiveTrip(duplicated.id, db);
    expect(await listTrips(db)).toHaveLength(1);
  });

  it("validates context IDs against their assigned trip field", async () => {
    const db = createTestDatabase();
    await db.contextOptions.add({
      id: "context:pool",
      type: "activity",
      label: "Pool",
      active: true,
      sortOrder: 0,
      createdAt: "2026-06-17T00:00:00.000Z",
      updatedAt: "2026-06-17T00:00:00.000Z",
    });

    await expect(createTrip({
      name: "Invalid context trip",
      tripType: "beach-holiday",
      startDate: "2026-07-01",
      endDate: "2026-07-08",
      nights: 7,
      destinations: [],
      climateContextIds: ["context:pool"],
      accommodationContextIds: [],
      transportContextIds: [],
      activityContextIds: [],
      travellerIds: ["traveller:1"],
      status: "draft",
    }, db)).rejects.toThrow("invalid climate context");

    await expect(createTrip({
      name: "Valid context trip",
      tripType: "beach-holiday",
      startDate: "2026-07-01",
      endDate: "2026-07-08",
      nights: 7,
      destinations: [],
      climateContextIds: [],
      accommodationContextIds: [],
      transportContextIds: [],
      activityContextIds: ["context:pool"],
      travellerIds: ["traveller:1"],
      status: "draft",
    }, db)).resolves.toMatchObject({ activityContextIds: ["context:pool"] });
  });
});
