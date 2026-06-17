import type { ProperlyPackedDatabase } from "../schema";
import { appDb } from "../schema";
import type { Trip, TripItineraryDay } from "../types";

const DAY_MS = 86_400_000;

export type TripItineraryDayInput = {
  title?: string;
  destinationContexts: string[];
  climateContexts: string[];
  accommodationContexts: string[];
  transportContexts: string[];
  activityContexts: string[];
  notes?: string;
};

export type TripItineraryDayUpdate = TripItineraryDayInput & {
  dayNumber: number;
};

export async function listItineraryDaysForTrip(
  trip: Trip,
  db: ProperlyPackedDatabase = appDb,
) {
  const persistedDays = await db.tripItineraryDays
    .where("tripId")
    .equals(trip.id)
    .toArray();
  const persistedByDay = new Map(
    persistedDays.map((day) => [day.dayNumber, day]),
  );
  const dayCount = getTripDayCount(trip);

  return Array.from({ length: dayCount }, (_, index) => {
    const dayNumber = index + 1;
    const persisted = persistedByDay.get(dayNumber);

    return createItineraryDay(trip, dayNumber, persisted);
  });
}

export async function saveItineraryDay(
  trip: Trip,
  dayNumber: number,
  input: TripItineraryDayInput,
  db: ProperlyPackedDatabase = appDb,
) {
  if (dayNumber < 1 || dayNumber > getTripDayCount(trip)) {
    throw new Error("Itinerary day is outside the trip dates.");
  }

  const [savedDay] = await saveItineraryDays(
    trip,
    [{ ...input, dayNumber }],
    db,
  );

  return savedDay;
}

export async function saveItineraryDays(
  trip: Trip,
  inputs: TripItineraryDayUpdate[],
  db: ProperlyPackedDatabase = appDb,
) {
  const now = new Date().toISOString();
  const dayCount = getTripDayCount(trip);
  const persistedDays = await db.tripItineraryDays
    .where("tripId")
    .equals(trip.id)
    .toArray();
  const persistedByDay = new Map(
    persistedDays.map((day) => [day.dayNumber, day]),
  );
  const daysToSave = inputs
    .filter((input) => input.dayNumber >= 1 && input.dayNumber <= dayCount)
    .map((input) =>
      buildSavedItineraryDay(
        trip,
        input.dayNumber,
        input,
        persistedByDay.get(input.dayNumber),
        now,
      ),
    );

  await db.transaction("rw", db.tripItineraryDays, async () => {
    await db.tripItineraryDays.bulkPut(daysToSave);
  });

  return daysToSave;
}

export function getTripDayCount(trip: Trip) {
  const start = parseTripDate(trip.startDate);
  const end = parseTripDate(trip.endDate);

  if (start !== undefined && end !== undefined && end >= start) {
    return Math.max(1, Math.round((end - start) / DAY_MS) + 1);
  }

  return Number.isFinite(trip.nights) ? Math.max(1, trip.nights + 1) : 1;
}

export function getTripDateForDay(trip: Trip, dayNumber: number) {
  const start = parseTripDate(trip.startDate);

  if (start === undefined) {
    return trip.startDate;
  }

  return new Date(start + (dayNumber - 1) * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function splitClimateProfileValues(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function mergeUniqueContextValues(...groups: string[][]) {
  const values: string[] = [];

  groups.flat().forEach((value) => {
    const nextValue = value.trim();

    if (!nextValue) {
      return;
    }

    const normalisedNextValue = normaliseContextValue(nextValue);
    const alreadyExists = values.some(
      (currentValue) => normaliseContextValue(currentValue) === normalisedNextValue,
    );

    if (!alreadyExists) {
      values.push(nextValue);
    }
  });

  return values;
}

function createItineraryDay(
  trip: Trip,
  dayNumber: number,
  persisted?: TripItineraryDay,
): TripItineraryDay {
  const date = getTripDateForDay(trip, dayNumber);

  return {
    id: persisted?.id ?? `itinerary-day:pending:${trip.id}:${dayNumber}`,
    tripId: trip.id,
    dayNumber,
    date,
    title: persisted?.title,
    destinationContexts: persisted?.destinationContexts ?? [],
    climateContexts: persisted?.climateContexts ?? [],
    accommodationContexts: persisted?.accommodationContexts ?? [],
    transportContexts: persisted?.transportContexts ?? [],
    activityContexts: persisted?.activityContexts ?? [],
    notes: persisted?.notes,
    createdAt: persisted?.createdAt ?? trip.createdAt,
    updatedAt: persisted?.updatedAt ?? trip.updatedAt,
  };
}

function buildSavedItineraryDay(
  trip: Trip,
  dayNumber: number,
  input: TripItineraryDayInput,
  persisted: TripItineraryDay | undefined,
  now: string,
): TripItineraryDay {
  return {
    id: persisted?.id ?? createId("itinerary-day"),
    tripId: trip.id,
    dayNumber,
    date: getTripDateForDay(trip, dayNumber),
    title: input.title?.trim() || undefined,
    destinationContexts: normaliseContextValues(input.destinationContexts),
    climateContexts: normaliseContextValues(input.climateContexts),
    accommodationContexts: normaliseContextValues(input.accommodationContexts),
    transportContexts: normaliseContextValues(input.transportContexts),
    activityContexts: normaliseContextValues(input.activityContexts),
    notes: input.notes?.trim() || undefined,
    createdAt: persisted?.createdAt ?? now,
    updatedAt: now,
  };
}

function normaliseContextValues(values: string[]) {
  return mergeUniqueContextValues(values);
}

function normaliseContextValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function parseTripDate(value: string) {
  const timestamp = Date.parse(`${value}T00:00:00Z`);

  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }

  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
