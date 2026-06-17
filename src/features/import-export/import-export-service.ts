import {
  appDb,
  applyInitialSeed,
  DATABASE_VERSION,
  type ProperlyPackedDatabase,
} from "../../db";
import { APP_VERSION } from "../../lib/app-version";
import {
  EXPORT_SCHEMA_VERSION,
  exportTableNames,
  type ExportTableName,
  type ExportTables,
  type ImportPreview,
  type ProperlyPackedExport,
} from "./export-schema";

export class ImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportValidationError";
  }
}

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
    throw new ImportValidationError("Import file must contain an object.");
  }

  if (value.schemaVersion !== EXPORT_SCHEMA_VERSION) {
    throw new ImportValidationError("Unsupported export schema version.");
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

    if (tableValue === undefined && tableName === "tripItineraryDays") {
      tables[tableName] = [];
      continue;
    }

    if (!Array.isArray(tableValue)) {
      throw new ImportValidationError(`Table ${tableName} must be an array.`);
    }
  }

  normaliseImportedOwnership(tables);

  return value as ProperlyPackedExport;
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
    counts,
  };
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
