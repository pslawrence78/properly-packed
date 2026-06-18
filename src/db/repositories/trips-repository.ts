import { clearActiveTripId, getActiveTripId } from "./app-settings-repository";
import type { ProperlyPackedDatabase } from "../schema";
import { appDb } from "../schema";
import type { Trip, TripStatus, TripType } from "../types";

export type TripInput = {
  name: string;
  tripType: TripType;
  startDate: string;
  endDate: string;
  nights: number;
  destinations: string[];
  climateContextIds: string[];
  accommodationContextIds: string[];
  transportContextIds: string[];
  activityContextIds: string[];
  travellerIds: string[];
  status: TripStatus;
  notes?: string;
};

export async function listTrips(db: ProperlyPackedDatabase = appDb) {
  const trips = await db.trips.toArray();
  return trips
    .filter((trip) => !trip.archivedAt)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export async function getTrip(id: string, db: ProperlyPackedDatabase = appDb) {
  return db.trips.get(id);
}

export async function getActiveTrip(db: ProperlyPackedDatabase = appDb) {
  const activeTripId = await getActiveTripId(db);
  return activeTripId ? getTrip(activeTripId, db) : undefined;
}

export async function createTrip(
  input: TripInput,
  db: ProperlyPackedDatabase = appDb,
) {
  await validateTripContextIds(input, db);
  const now = new Date().toISOString();
  const trip: Trip = {
    id: createId("trip"),
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  await db.trips.add(trip);
  return trip;
}

export async function updateTrip(
  id: string,
  updates: Partial<TripInput>,
  db: ProperlyPackedDatabase = appDb,
) {
  const existing = await getTrip(id, db);
  if (!existing) {
    throw new Error("Trip not found.");
  }
  await validateTripContextIds({ ...existing, ...updates }, db);
  await db.trips.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  return getTrip(id, db);
}

export async function archiveTrip(
  id: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const now = new Date().toISOString();
  await db.trips.update(id, {
    archivedAt: now,
    updatedAt: now,
  });

  const activeTripId = await getActiveTripId(db);
  if (activeTripId === id) {
    await clearActiveTripId(db);
  }
}

export async function duplicateTripShell(
  id: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const trip = await getTrip(id, db);

  if (!trip) {
    throw new Error("Trip not found.");
  }

  return createTrip(
    {
      name: `${trip.name} copy`,
      tripType: trip.tripType,
      startDate: trip.startDate,
      endDate: trip.endDate,
      nights: trip.nights,
      destinations: [...trip.destinations],
      climateContextIds: [...(trip.climateContextIds ?? [])],
      accommodationContextIds: [...(trip.accommodationContextIds ?? [])],
      transportContextIds: [...(trip.transportContextIds ?? [])],
      activityContextIds: [...(trip.activityContextIds ?? [])],
      travellerIds: [...trip.travellerIds],
      status: "draft",
      notes: trip.notes,
    },
    db,
  );
}

async function validateTripContextIds(
  input: Pick<
    TripInput,
    | "climateContextIds"
    | "accommodationContextIds"
    | "transportContextIds"
    | "activityContextIds"
  >,
  db: ProperlyPackedDatabase,
) {
  const expectedTypes = [
    ["climateContextIds", "climate"],
    ["accommodationContextIds", "accommodation"],
    ["transportContextIds", "transport"],
    ["activityContextIds", "activity"],
  ] as const;

  for (const [field, type] of expectedTypes) {
    const ids = input[field] ?? [];
    if (new Set(ids).size !== ids.length) {
      throw new Error("Trip context selections cannot contain duplicates.");
    }
    const options = await db.contextOptions.bulkGet(ids);
    if (options.some((option) => !option || option.type !== type)) {
      throw new Error(`Trip contains an invalid ${type} context selection.`);
    }
  }
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }

  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
