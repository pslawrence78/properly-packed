import type { PackingItem, Traveller } from "../../../db/types";
import type { QuickAddContextDefault } from "../packing-item-utils";
import { createDuplicateKey, normaliseBulkToken } from "../bulk-capture-utils";
import type {
  PackingAutocompleteEntry,
  PackingAutocompleteOwnerHint,
} from "./packing-autocomplete-types";

export function normaliseAutocompleteText(value: string) {
  return normaliseBulkToken(
    value.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  );
}

export function tokeniseAutocompleteText(value: string) {
  return normaliseAutocompleteText(value).split(" ").filter(Boolean);
}

export function resolveAutocompleteCategory(
  entry: PackingAutocompleteEntry,
  categories: string[] = [],
) {
  if (!entry.categoryHint) return undefined;
  return categories.includes(entry.categoryHint) ? entry.categoryHint : undefined;
}

export function resolveAutocompleteOwnership({
  entry,
  quickAddContext,
  travellers = [],
}: {
  entry: PackingAutocompleteEntry;
  quickAddContext?: QuickAddContextDefault;
  travellers?: Traveller[];
}) {
  if (quickAddContext?.ownershipScope && quickAddContext.ownershipScope !== "unassigned") {
    return {
      ownershipScope: quickAddContext.ownershipScope,
      ownerTravellerId: quickAddContext.ownerTravellerId,
    };
  }

  const ownerHint = entry.ownerHint;
  if (!ownerHint) return undefined;

  if (ownerHint === "shared" || ownerHint === "shared-family") {
    return { ownershipScope: "shared" as const };
  }

  const traveller = findTravellerForOwnerHint(ownerHint, travellers);
  return traveller
    ? { ownershipScope: "traveller" as const, ownerTravellerId: traveller.id }
    : undefined;
}

export function findAutocompleteDuplicate({
  category,
  entry,
  existingItems = [],
  ownership,
}: {
  category?: string;
  entry: PackingAutocompleteEntry;
  existingItems?: PackingItem[];
  ownership?: { ownershipScope: PackingItem["ownershipScope"]; ownerTravellerId?: string };
}) {
  if (!category || !ownership) return undefined;
  const suggestionKey = createDuplicateKey({
    category,
    name: entry.name,
    ownershipScope: ownership.ownershipScope,
    ownerTravellerId: ownership.ownerTravellerId,
  });
  return existingItems.find((item) => createDuplicateKey(item) === suggestionKey);
}

function findTravellerForOwnerHint(
  ownerHint: Exclude<PackingAutocompleteOwnerHint, "shared" | "shared-family">,
  travellers: Traveller[],
) {
  if (ownerHint === "adult" || ownerHint === "child" || ownerHint === "dog") {
    return travellers.find((traveller) => traveller.travellerType === ownerHint);
  }

  return travellers.find((traveller) =>
    normaliseAutocompleteText(traveller.name).startsWith(ownerHint),
  );
}
