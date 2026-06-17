import type {
  PackingItem,
  PackingPriority,
  PackingStatus,
} from "../../db/types";

export const SHARED_OWNERSHIP_FILTER = "__shared";
export const UNASSIGNED_OWNERSHIP_FILTER = "__unassigned";

export const packingStatusOptions: { value: PackingStatus; label: string }[] = [
  { value: "needed", label: "Needed" },
  { value: "to-buy", label: "To buy" },
  { value: "to-wash", label: "To wash" },
  { value: "to-charge", label: "To charge" },
  { value: "to-download", label: "To download" },
  { value: "to-decide", label: "To decide" },
  { value: "ready", label: "Ready" },
  { value: "packed", label: "Packed" },
  { value: "not-taking", label: "Not taking" },
];

export const packingPriorityOptions: {
  value: PackingPriority;
  label: string;
}[] = [
  { value: "essential", label: "Essential" },
  { value: "important", label: "Important" },
  { value: "useful", label: "Useful" },
  { value: "nice-to-have", label: "Nice to have" },
  { value: "luxury", label: "Luxury" },
  { value: "consider-leaving", label: "Consider leaving behind" },
];

export type PackingFilters = {
  ownerTravellerId: string;
  category: string;
  status: string;
  priority: string;
  bagId: string;
  search: string;
};

export type PackingProgress = {
  packedCount: number;
  packableCount: number;
  notTakingCount: number;
  percentPacked: number;
};

export function calculatePackingProgress(
  items: Pick<PackingItem, "status">[],
): PackingProgress {
  const notTakingCount = items.filter(
    (item) => item.status === "not-taking",
  ).length;
  const packableItems = items.filter((item) => item.status !== "not-taking");
  const packedCount = packableItems.filter(
    (item) => item.status === "packed",
  ).length;
  const packableCount = packableItems.length;

  return {
    packedCount,
    packableCount,
    notTakingCount,
    percentPacked:
      packableCount === 0 ? 0 : Math.round((packedCount / packableCount) * 100),
  };
}

export function filterPackingItems(
  items: PackingItem[],
  filters: PackingFilters,
) {
  const search = filters.search.trim().toLowerCase();

  return items.filter((item) => {
    if (
      filters.ownerTravellerId &&
      !ownershipMatchesFilter(item, filters.ownerTravellerId)
    ) {
      return false;
    }

    if (filters.category && item.category !== filters.category) {
      return false;
    }

    if (filters.status && item.status !== filters.status) {
      return false;
    }

    if (filters.priority && item.priority !== filters.priority) {
      return false;
    }

    if (filters.bagId === "__unassigned" && item.bagId) {
      return false;
    }

    if (
      filters.bagId &&
      filters.bagId !== "__unassigned" &&
      item.bagId !== filters.bagId
    ) {
      return false;
    }

    if (search && !item.name.toLowerCase().includes(search)) {
      return false;
    }

    return true;
  });
}

export function normaliseCategory(category: string) {
  return category.trim().toLowerCase().replace(/\s+/g, "-");
}

function ownershipMatchesFilter(item: PackingItem, ownerFilter: string) {
  if (ownerFilter === SHARED_OWNERSHIP_FILTER) {
    return item.ownershipScope === "shared";
  }

  if (ownerFilter === UNASSIGNED_OWNERSHIP_FILTER) {
    return item.ownershipScope === "unassigned";
  }

  return item.ownershipScope === "traveller" && item.ownerTravellerId === ownerFilter;
}
