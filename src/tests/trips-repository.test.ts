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
        accommodationTypes: ["ship"],
        transportModes: ["car"],
        activityContexts: ["pool"],
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
});
