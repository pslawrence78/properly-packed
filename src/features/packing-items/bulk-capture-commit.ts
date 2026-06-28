import type { PackingItemInput } from "../../db/repositories/packing-items-repository";
import type { BulkCaptureRow } from "./bulk-capture-types";
import { isBlockingWarning } from "./bulk-capture-utils";

export function buildBulkPackingItemInput(
  row: BulkCaptureRow,
  tripId: string,
): PackingItemInput {
  if (!row.name.trim()) {
    throw new Error(`Line ${row.lineNumber}: enter an item name.`);
  }
  if (!Number.isInteger(row.quantity) || row.quantity < 1) {
    throw new Error(`Line ${row.lineNumber}: quantity must be at least 1.`);
  }
  const blockingWarning = row.warnings.find(isBlockingWarning);
  if (blockingWarning) {
    throw new Error(`Line ${row.lineNumber}: ${blockingWarning}`);
  }
  if (row.ownershipScope === "traveller" && !row.ownerTravellerId) {
    throw new Error(`Line ${row.lineNumber}: select an owner traveller.`);
  }

  return {
    tripId,
    name: row.name.trim(),
    ownershipScope: row.ownershipScope,
    ownerTravellerId:
      row.ownershipScope === "traveller" ? row.ownerTravellerId : undefined,
    category: row.category.trim() || "misc",
    quantity: row.quantity,
    priority: row.priority,
    status: row.status,
    bagId: row.bagId || undefined,
    notes: row.notes.length > 0 ? row.notes.join("; ") : undefined,
  };
}

export function buildBulkPackingItemInputs(
  rows: BulkCaptureRow[],
  tripId: string,
) {
  return rows
    .filter((row) => row.included)
    .map((row) => buildBulkPackingItemInput(row, tripId));
}
