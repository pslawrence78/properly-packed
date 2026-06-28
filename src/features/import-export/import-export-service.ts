import {
  appDb,
  applyInitialSeed,
  DATABASE_VERSION,
  type ProperlyPackedDatabase,
} from "../../db";
import { APP_VERSION } from "../../lib/app-version";
import {
  EXPORT_SCHEMA_VERSION,
  SUPPORTED_EXPORT_SCHEMA_VERSIONS,
  exportTableNames,
  type ExportTableName,
  type ExportTables,
  type ImportPreview,
  type ProperlyPackedExport,
} from "./export-schema";
import { contextOptionTypes, normaliseContextLabel } from "../../db/context-options";
import { resolveActiveTrip } from "../../db/repositories/trips-repository";
import type { ContextOption, ContextOptionType } from "../../db/types";

const reviewLearningTypes = new Set([
  "forgotten", "unused", "invaluable", "packed-in-wrong-bag",
  "buy-for-next-time", "do-not-suggest-again", "always-suggest",
]);
const tripTypes = new Set([
  "beach-holiday", "city-break", "cruise", "fly-cruise", "ex-uk-cruise",
  "theme-park", "staycation", "short-break", "cold-weather",
  "special-occasion", "multi-centre", "family-visit",
]);

export class ImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportValidationError";
  }
}

export type DataSafetySummary = {
  travellers: number;
  trips: number;
  packingItems: number;
  bags: number;
  templates: number;
  contextOptions: number;
  lastExportedAt?: string;
};

export async function generateExportData(
  db: ProperlyPackedDatabase = appDb,
  nowFactory: () => string = () => new Date().toISOString(),
): Promise<ProperlyPackedExport> {
  const tables: Partial<Record<ExportTableName, unknown[]>> = {};

  for (const tableName of exportTableNames) {
    tables[tableName] = await db.table(tableName).toArray();
  }

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: nowFactory(),
    appVersion: APP_VERSION,
    databaseVersion: DATABASE_VERSION,
    tables: tables as ExportTables,
  };
}

export function stringifyExport(data: ProperlyPackedExport) {
  return JSON.stringify(data, null, 2);
}

export function parseImportJson(json: string) {
  try {
    return validateImportData(JSON.parse(json));
  } catch (error) {
    if (error instanceof ImportValidationError) {
      throw error;
    }

    throw new ImportValidationError("Import file is not valid JSON.");
  }
}

export function validateImportData(value: unknown): ProperlyPackedExport {
  if (!isRecord(value)) {
    throw new ImportValidationError("This file is not a Properly Packed export.");
  }

  if (typeof value.schemaVersion !== "string" || !("tables" in value)) {
    throw new ImportValidationError("This file is not a Properly Packed export.");
  }

  if (
    !SUPPORTED_EXPORT_SCHEMA_VERSIONS.includes(
      value.schemaVersion as (typeof SUPPORTED_EXPORT_SCHEMA_VERSIONS)[number],
    )
  ) {
    const match = /^properly-packed-export-v(\d+)$/.exec(value.schemaVersion);
    if (match && Number(match[1]) > 2) {
      throw new ImportValidationError(
        "This backup uses a newer export schema than this app supports.",
      );
    }
    throw new ImportValidationError(
      "This file uses an unsupported Properly Packed export schema.",
    );
  }

  if (typeof value.exportedAt !== "string") {
    throw new ImportValidationError("Export timestamp is missing.");
  }

  if (typeof value.appVersion !== "string") {
    throw new ImportValidationError("App version is missing.");
  }

  if (typeof value.databaseVersion !== "number") {
    throw new ImportValidationError("Database version is missing.");
  }

  const tables = value.tables;

  if (!isRecord(tables)) {
    throw new ImportValidationError("Export tables are missing.");
  }

  for (const tableName of exportTableNames) {
    const tableValue = tables[tableName];

    if (
      tableValue === undefined &&
      (tableName === "tripItineraryDays" || tableName === "contextOptions")
    ) {
      tables[tableName] = [];
      continue;
    }

    if (!Array.isArray(tableValue)) {
      throw new ImportValidationError(`Table ${tableName} must be an array.`);
    }

    validateUniqueKeys(tableName, tableValue);
  }

  normaliseImportedOwnership(tables);
  normaliseImportedContexts(tables);
  validateReviewData(tables);

  return value as ProperlyPackedExport;
}

function validateReviewData(tables: Record<string, unknown>) {
  const trips = Array.isArray(tables.trips) ? tables.trips : [];
  const tripIds = new Set(
    trips
      .filter((trip) => isRecord(trip) && typeof trip.id === "string")
      .map((trip) => (trip as { id: string }).id),
  );
  const reviews = Array.isArray(tables.postTripReviews) ? tables.postTripReviews : [];
  const reviewIds = new Set<string>();
  for (const review of reviews) {
    if (!isRecord(review) || typeof review.id !== "string" || !review.id || typeof review.tripId !== "string" || !tripIds.has(review.tripId) || !isIsoDate(review.createdAt) || !isIsoDate(review.updatedAt)) {
      throw new ImportValidationError("Post-trip review is malformed.");
    }
    if (review.status !== undefined && review.status !== "draft" && review.status !== "completed") {
      throw new ImportValidationError("Post-trip review status is invalid.");
    }
    review.status = review.status ?? (typeof review.completedAt === "string" ? "completed" : "draft");
    if (review.completedAt !== undefined && !isIsoDate(review.completedAt)) {
      throw new ImportValidationError("Post-trip review completion date is invalid.");
    }
    if (review.status === "completed" && !isIsoDate(review.completedAt)) {
      throw new ImportValidationError("Completed post-trip review is missing its completion date.");
    }
    reviewIds.add(review.id);
  }

  const learnings = Array.isArray(tables.reviewLearnings) ? tables.reviewLearnings : [];
  for (const learning of learnings) {
    if (!isRecord(learning) || typeof learning.id !== "string" || !learning.id || typeof learning.reviewId !== "string" || !reviewIds.has(learning.reviewId) || typeof learning.itemName !== "string" || !learning.itemName.trim() || !reviewLearningTypes.has(String(learning.learningType)) || !Array.isArray(learning.appliesToTripTypes) || learning.appliesToTripTypes.some((tripType) => typeof tripType !== "string" || !tripTypes.has(tripType)) || !isIsoDate(learning.createdAt) || !isIsoDate(learning.updatedAt) || (learning.archivedAt !== undefined && !isIsoDate(learning.archivedAt))) {
      throw new ImportValidationError("Review learning is malformed or refers to a missing review.");
    }
    if (learning.sourceTripId !== undefined && typeof learning.sourceTripId !== "string") {
      throw new ImportValidationError("Review learning source trip is invalid.");
    }
  }
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.valueOf()) && date.toISOString() === value;
}

function validateUniqueKeys(tableName: ExportTableName, rows: unknown[]) {
  const keyField = tableName === "appSettings" ? "key" : "id";
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const key = row[keyField];
    if (typeof key !== "string" || !key) continue;
    if (seen.has(key)) {
      throw new ImportValidationError(
        `Table ${tableName} contains duplicate ${keyField} ${key}.`,
      );
    }
    seen.add(key);
  }
}

function normaliseImportedContexts(tables: Record<string, unknown>) {
  const rawOptions = Array.isArray(tables.contextOptions) ? tables.contextOptions : [];
  const options = rawOptions.map(validateContextOption);
  const ids = new Set<string>();
  const activeLabels = new Set<string>();

  for (const option of options) {
    if (ids.has(option.id)) {
      throw new ImportValidationError(`Duplicate context option ID ${option.id}.`);
    }
    ids.add(option.id);
    if (option.active && !option.archivedAt) {
      const key = `${option.type}:${normaliseContextLabel(option.label)}`;
      if (activeLabels.has(key)) {
        throw new ImportValidationError(`Duplicate active ${option.type} context label.`);
      }
      activeLabels.add(key);
    }
  }

  const byTypeAndLabel = new Map(
    options.map((option) => [
      `${option.type}:${normaliseContextLabel(option.label)}`,
      option,
    ]),
  );
  const byId = new Map(options.map((option) => [option.id, option]));
  const trips = Array.isArray(tables.trips) ? tables.trips : [];

  tables.trips = trips.map((trip) => {
    if (!isRecord(trip)) return trip;
    return {
      ...trip,
      climateContextIds: migrateTripContextField(
        trip.climateContextIds,
        typeof trip.climateProfile === "string" ? [trip.climateProfile] : [],
        "climate",
      ),
      accommodationContextIds: migrateTripContextField(
        trip.accommodationContextIds,
        trip.accommodationTypes,
        "accommodation",
      ),
      transportContextIds: migrateTripContextField(
        trip.transportContextIds,
        trip.transportModes,
        "transport",
      ),
      activityContextIds: migrateTripContextField(
        trip.activityContextIds,
        trip.activityContexts,
        "activity",
      ),
    };
  });
  tables.contextOptions = options;

  function migrateTripContextField(
    rawIds: unknown,
    rawLabels: unknown,
    type: ContextOptionType,
  ) {
    const result = new Set<string>();
    const hasIdField = Array.isArray(rawIds);
    if (hasIdField) {
      for (const id of rawIds) {
        if (typeof id !== "string" || byId.get(id)?.type !== type) {
          throw new ImportValidationError(`Trip contains an invalid ${type} context ID.`);
        }
        result.add(id);
      }
    }
    if (!hasIdField && Array.isArray(rawLabels)) {
      for (const rawLabel of rawLabels) {
        if (typeof rawLabel !== "string" || !rawLabel.trim()) continue;
        const label = rawLabel.trim().replace(/\s+/g, " ");
        const key = `${type}:${normaliseContextLabel(label)}`;
        let option = byTypeAndLabel.get(key);
        if (!option) {
          const now = new Date().toISOString();
          option = {
            id: createContextOptionId(),
            type,
            label,
            active: true,
            sortOrder: options.filter((candidate) => candidate.type === type).length,
            createdAt: now,
            updatedAt: now,
          };
          options.push(option);
          byTypeAndLabel.set(key, option);
          byId.set(option.id, option);
        }
        result.add(option.id);
      }
    }
    return [...result];
  }
}

function validateContextOption(value: unknown): ContextOption {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id) {
    throw new ImportValidationError("Context option ID is missing.");
  }
  if (!contextOptionTypes.includes(value.type as ContextOptionType)) {
    throw new ImportValidationError("Context option type is invalid.");
  }
  if (typeof value.label !== "string" || !value.label.trim()) {
    throw new ImportValidationError("Context option label is missing.");
  }
  if (typeof value.active !== "boolean") {
    throw new ImportValidationError("Context option active state is invalid.");
  }
  if (typeof value.sortOrder !== "number" || !Number.isFinite(value.sortOrder)) {
    throw new ImportValidationError("Context option sort order is invalid.");
  }
  if (typeof value.createdAt !== "string" || typeof value.updatedAt !== "string") {
    throw new ImportValidationError("Context option timestamps are missing.");
  }
  return value as ContextOption;
}

function createContextOptionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `context-option:${crypto.randomUUID()}`;
  }
  return `context-option:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export function createImportPreview(data: ProperlyPackedExport): ImportPreview {
  const counts = {} as Record<ExportTableName, number>;

  for (const tableName of exportTableNames) {
    counts[tableName] = data.tables[tableName].length;
  }

  return {
    schemaVersion: data.schemaVersion,
    exportedAt: data.exportedAt,
    appVersion: data.appVersion,
    databaseVersion: data.databaseVersion,
    supported: true,
    compatibilityMessage:
      data.schemaVersion === "properly-packed-export-v1"
        ? "Supported legacy v1 backup. It will be upgraded during import."
        : "Supported current v2 backup.",
    counts,
  };
}

export async function getDataSafetySummary(
  db: ProperlyPackedDatabase = appDb,
): Promise<DataSafetySummary> {
  const [travellers, trips, packingItems, bags, templates, contextOptions, lastExport] =
    await Promise.all([
      db.travellers.count(),
      db.trips.count(),
      db.packingItems.count(),
      db.bags.count(),
      db.templates.count(),
      db.contextOptions.count(),
      db.appSettings.get("lastExportedAt"),
    ]);
  return {
    travellers,
    trips,
    packingItems,
    bags,
    templates,
    contextOptions,
    lastExportedAt:
      typeof lastExport?.value === "string" ? lastExport.value : undefined,
  };
}

export async function recordSuccessfulExport(
  exportedAt: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const existing = await db.appSettings.get("lastExportedAt");
  await db.appSettings.put({
    key: "lastExportedAt",
    value: exportedAt,
    createdAt: existing?.createdAt ?? exportedAt,
    updatedAt: exportedAt,
  });
}

export async function replaceDataFromExport(
  data: ProperlyPackedExport,
  db: ProperlyPackedDatabase = appDb,
) {
  validateImportData(data);
  const tables = exportTableNames.map((tableName) => db.table(tableName));

  await db.transaction("rw", tables, async () => {
    for (const tableName of exportTableNames) {
      await db.table(tableName).clear();
    }

    for (const tableName of exportTableNames) {
      await db.table(tableName).bulkAdd(data.tables[tableName]);
    }
  });

  await resolveActiveTrip(db);
}

export async function resetLocalData(
  db: ProperlyPackedDatabase = appDb,
  nowFactory: () => string = () => new Date().toISOString(),
) {
  const tables = exportTableNames.map((tableName) => db.table(tableName));

  await db.transaction("rw", tables, async () => {
    for (const tableName of exportTableNames) {
      await db.table(tableName).clear();
    }
  });

  return applyInitialSeed(db, nowFactory);
}

export function createExportFilename(exportedAt: string) {
  const safeTimestamp = exportedAt.replace(/[:.]/g, "-");
  return `properly-packed-backup-${safeTimestamp}.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normaliseImportedOwnership(tables: Record<string, unknown>) {
  const travellers = Array.isArray(tables.travellers) ? tables.travellers : [];
  const legacySharedTravellerIds = new Set(
    travellers
      .filter(
        (traveller) =>
          isRecord(traveller) &&
          (traveller.seedKey === "traveller:shared-family" ||
            traveller.travellerType === "shared" ||
            (traveller.name === "Shared Family" && traveller.seedKey)),
      )
      .map((traveller) => (traveller as { id: string }).id),
  );

  if (Array.isArray(tables.packingItems)) {
    tables.packingItems = tables.packingItems.map((item) => {
      if (!isRecord(item)) {
        return item;
      }

      const ownerTravellerId =
        typeof item.ownerTravellerId === "string" ? item.ownerTravellerId : undefined;
      const ownershipScope =
        item.ownershipScope === "traveller" ||
        item.ownershipScope === "shared" ||
        item.ownershipScope === "unassigned"
          ? item.ownershipScope
          : ownerTravellerId
            ? "traveller"
            : "unassigned";

      if (ownerTravellerId && legacySharedTravellerIds.has(ownerTravellerId)) {
        const { ownerTravellerId: _legacyOwner, ...rest } = item;
        return { ...rest, ownershipScope: "shared" };
      }

      if (ownershipScope !== "traveller") {
        const { ownerTravellerId: _ownerTravellerId, ...rest } = item;
        return { ...rest, ownershipScope };
      }

      return { ...item, ownershipScope };
    });
  }

  if (Array.isArray(tables.bags) && legacySharedTravellerIds.size > 0) {
    tables.bags = tables.bags.map((bag) => {
      if (
        isRecord(bag) &&
        typeof bag.ownerTravellerId === "string" &&
        legacySharedTravellerIds.has(bag.ownerTravellerId)
      ) {
        const { ownerTravellerId: _ownerTravellerId, ...rest } = bag;
        return rest;
      }

      return bag;
    });
  }

  if (Array.isArray(tables.trips) && legacySharedTravellerIds.size > 0) {
    tables.trips = tables.trips.map((trip) => {
      if (!isRecord(trip) || !Array.isArray(trip.travellerIds)) {
        return trip;
      }

      return {
        ...trip,
        travellerIds: trip.travellerIds.filter(
          (travellerId) =>
            typeof travellerId !== "string" ||
            !legacySharedTravellerIds.has(travellerId),
        ),
      };
    });
  }

  if (legacySharedTravellerIds.size > 0) {
    tables.travellers = travellers.filter(
      (traveller) =>
        !(
          isRecord(traveller) &&
          typeof traveller.id === "string" &&
          legacySharedTravellerIds.has(traveller.id)
        ),
    );
  }
}
