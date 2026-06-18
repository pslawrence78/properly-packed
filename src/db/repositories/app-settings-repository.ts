import { APP_VERSION } from "../../lib/app-version";
import type { ProperlyPackedDatabase } from "../schema";
import { appDb, DATABASE_VERSION } from "../schema";
import { SEED_VERSION } from "../seed-data";
import type { AppSetting, SettingValue } from "../types";

export type DatabaseStatus = {
  appVersion: string;
  databaseVersion: number;
  seedVersion: string;
  seededAt?: string;
  travellerCount: number;
  defaultTravellerCount: number;
  categoryCount: number;
  bagTypeCount: number;
};

export const ACTIVE_TRIP_CHANGED_EVENT = "properly-packed:active-trip-changed";

export async function getSetting(
  key: string,
  db: ProperlyPackedDatabase = appDb,
) {
  return db.appSettings.get(key);
}

export async function putSetting(
  key: string,
  value: SettingValue,
  db: ProperlyPackedDatabase = appDb,
) {
  const now = new Date().toISOString();
  const existing = await db.appSettings.get(key);
  const setting: AppSetting = {
    key,
    value,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.appSettings.put(setting);
  return setting;
}

export async function getActiveTripId(db: ProperlyPackedDatabase = appDb) {
  const setting = await db.appSettings.get("activeTripId");
  return typeof setting?.value === "string" ? setting.value : undefined;
}

export async function setActiveTripId(
  tripId: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const setting = await putSetting("activeTripId", tripId, db);
  notifyActiveTripChanged();
  return setting;
}

export async function clearActiveTripId(db: ProperlyPackedDatabase = appDb) {
  await db.appSettings.delete("activeTripId");
  notifyActiveTripChanged();
}

function notifyActiveTripChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACTIVE_TRIP_CHANGED_EVENT));
  }
}

export async function getDatabaseStatus(
  db: ProperlyPackedDatabase = appDb,
): Promise<DatabaseStatus> {
  const [seedVersion, seededAt, categories, bagTypes, travellerCount] =
    await Promise.all([
      db.appSettings.get("seedVersion"),
      db.appSettings.get("seededAt"),
      db.appSettings.get("defaultCategories"),
      db.appSettings.get("defaultBagTypes"),
      db.travellers.count(),
    ]);

  const defaultTravellerCount = await db.travellers
    .toArray()
    .then(
      (travellers) =>
        travellers.filter((traveller) => traveller.defaultIncluded).length,
    );

  return {
    appVersion: APP_VERSION,
    databaseVersion: DATABASE_VERSION,
    seedVersion: String(seedVersion?.value ?? SEED_VERSION),
    seededAt: typeof seededAt?.value === "string" ? seededAt.value : undefined,
    travellerCount,
    defaultTravellerCount,
    categoryCount: Array.isArray(categories?.value) ? categories.value.length : 0,
    bagTypeCount: Array.isArray(bagTypes?.value) ? bagTypes.value.length : 0,
  };
}
