import type {
  Bag,
  ItemOwnershipScope,
  PackingItem,
  Traveller,
} from "../../db/types";
import type { BulkCaptureRow, BulkCaptureSummary } from "./bulk-capture-types";
import { formatPackingLabel } from "./packing-item-utils";

export function normaliseBulkToken(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normaliseDuplicatePart(value?: string) {
  return normaliseBulkToken(value ?? "");
}

export function createDuplicateKey(input: {
  category: string;
  name: string;
  ownerTravellerId?: string;
  ownershipScope: ItemOwnershipScope;
}) {
  const owner =
    input.ownershipScope === "traveller"
      ? input.ownerTravellerId ?? "unknown"
      : input.ownershipScope;
  return [
    normaliseDuplicatePart(input.name),
    normaliseDuplicatePart(owner),
    normaliseDuplicatePart(input.category),
  ].join("|");
}

export function matchTravellerByToken(
  token: string,
  travellers: Traveller[],
): Traveller | undefined {
  const normalised = normaliseBulkToken(token);
  if (!normalised) return undefined;

  const aliases = new Map<string, string>();
  for (const traveller of travellers) {
    aliases.set(normaliseBulkToken(traveller.name), traveller.id);
    aliases.set(normaliseBulkToken(traveller.name.split(/\s+/)[0] ?? ""), traveller.id);
  }

  const sharedFamily = travellers.find(
    (traveller) => normaliseBulkToken(traveller.name) === "shared family",
  );
  if (sharedFamily) {
    aliases.set("shared", sharedFamily.id);
    aliases.set("family", sharedFamily.id);
  }

  const matchedId = aliases.get(normalised);
  return matchedId ? travellers.find((traveller) => traveller.id === matchedId) : undefined;
}

export function matchBagByToken(token: string, bags: Bag[]) {
  const normalised = normaliseBulkToken(token);
  return bags.find((bag) => normaliseBulkToken(bag.name) === normalised);
}

export function matchCategoryByToken(token: string, categories: string[]) {
  const normalised = normaliseBulkToken(token);
  const direct = categories.find(
    (category) =>
      normaliseBulkToken(category) === normalised ||
      normaliseBulkToken(formatPackingLabel(category)) === normalised,
  );
  if (direct) return direct;

  const synonyms: Record<string, string[]> = {
    "cruise-extras": ["cruise", "cruise cabin", "cabin", "cabin extras"],
    documents: ["admin", "travel documents", "travel documents pouch"],
    electronics: [
      "charger",
      "chargers",
      "chargers and cables",
      "charging",
      "gadget",
      "gadgets",
      "photography",
      "technology",
    ],
    entertainment: ["kids kit", "kids", "child entertainment"],
    health: ["first aid", "medication", "medicine", "sun care"],
    pet: ["dog", "dog kit"],
    "travel-day": ["hand luggage", "travel day", "day bag"],
  };

  for (const [category, tokens] of Object.entries(synonyms)) {
    if (categories.includes(category) && tokens.includes(normalised)) {
      return category;
    }
  }

  return undefined;
}

export function findExistingDuplicate(
  row: BulkCaptureRow,
  existingItems: PackingItem[],
) {
  const rowKey = createDuplicateKey(row);
  return existingItems.find((item) => createDuplicateKey(item) === rowKey);
}

export function summariseBulkRows(rows: BulkCaptureRow[]): BulkCaptureSummary {
  return {
    parsedCount: rows.length,
    readyCount: rows.filter((row) => row.included && !row.warnings.some(isBlockingWarning)).length,
    skippedCount: rows.filter((row) => !row.included).length,
    warningCount: rows.filter((row) => row.warnings.length > 0).length,
    duplicateCount: rows.filter((row) => row.duplicate).length,
  };
}

export function isBlockingWarning(warning: string) {
  return (
    warning.startsWith("Unknown owner") ||
    warning.startsWith("Invalid quantity") ||
    warning.startsWith("Enter an item name")
  );
}
