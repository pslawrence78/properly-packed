import type {
  Bag,
  ItemOwnershipScope,
  PackingItem,
  PackingPriority,
  PackingStatus,
  Traveller,
} from "../../db/types";

export const SHARED_OWNERSHIP_FILTER = "__shared";
export const UNASSIGNED_OWNERSHIP_FILTER = "__unassigned";
export const UNASSIGNED_BAG_FILTER = "__unassigned";

export type PackViewMode = "person" | "category" | "bag" | "action" | "flat";

export const packingStatusOptions: { value: PackingStatus; label: string }[] = [
  { value: "needed", label: "Needed" },
  { value: "to-buy", label: "To buy" },
  { value: "to-wash", label: "To wash" },
  { value: "to-charge", label: "To charge" },
  { value: "to-download", label: "To download" },
  { value: "to-decide", label: "To decide" },
  { value: "ready", label: "Ready" },
  { value: "packed", label: "Packed" },
  { value: "hand-luggage", label: "Hand luggage" },
  { value: "suitcase", label: "Suitcase" },
  { value: "not-taking", label: "Not taking" },
  { value: "used", label: "Used" },
  { value: "unused", label: "Unused" },
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
  outstanding?: boolean;
};

export type PackingProgress = {
  packedCount: number;
  packableCount: number;
  notTakingCount: number;
  percentPacked: number;
};

export type QuickAddOwnershipDefault = {
  ownershipScope: ItemOwnershipScope;
  ownerTravellerId?: string;
};

export type QuickAddContextDefault = QuickAddOwnershipDefault & {
  bagId?: string;
  category?: string;
  status?: PackingStatus;
};

export type PackingGroup = {
  id: string;
  title: string;
  subtitle?: string;
  items: PackingItem[];
  progress: PackingProgress;
  outstandingCount: number;
  essentialOutstandingCount: number;
  actionCount: number;
  emptyMessage?: string;
  quickAddDefault?: QuickAddContextDefault;
};

export function packingFiltersFromSearchParams(params: URLSearchParams): PackingFilters {
  const statuses = new Set(packingStatusOptions.map(({ value }) => value));
  const priorities = new Set(packingPriorityOptions.map(({ value }) => value));
  const status = params.get("status") ?? "";
  const priority = params.get("priority") ?? "";

  return {
    ownerTravellerId: params.get("owner") ?? "",
    category: params.get("category") ?? "",
    status: statuses.has(status as PackingStatus) ? status : "",
    priority: priorities.has(priority as PackingPriority) ? priority : "",
    bagId: params.get("bag") ?? "",
    search: params.get("search") ?? "",
    outstanding: params.get("outstanding") === "true",
  };
}

export function getQuickAddOwnershipDefault(
  ownerFilter: string,
  travellerIds: string[],
): QuickAddOwnershipDefault {
  if (ownerFilter === SHARED_OWNERSHIP_FILTER) {
    return { ownershipScope: "shared" };
  }
  if (ownerFilter === UNASSIGNED_OWNERSHIP_FILTER) {
    return { ownershipScope: "unassigned" };
  }
  if (travellerIds.includes(ownerFilter)) {
    return { ownershipScope: "traveller", ownerTravellerId: ownerFilter };
  }
  return { ownershipScope: "unassigned" };
}

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

export function buildPackingGroups({
  bags,
  items,
  travellers,
  viewMode,
}: {
  bags: Bag[];
  items: PackingItem[];
  travellers: Traveller[];
  viewMode: PackViewMode;
}): PackingGroup[] {
  if (viewMode === "flat") {
    return [
      createPackingGroup({
        id: "flat",
        items,
        title: "All items",
        quickAddDefault: { ownershipScope: "unassigned" },
      }),
    ];
  }

  if (viewMode === "person") {
    return buildPersonGroups(items, travellers);
  }

  if (viewMode === "category") {
    return buildCategoryGroups(items);
  }

  if (viewMode === "bag") {
    return buildBagGroups(items, bags, travellers);
  }

  return buildActionGroups(items);
}

export function filterPackingItems(
  items: PackingItem[],
  filters: PackingFilters,
  bags: Bag[] = [],
) {
  const search = filters.search.trim().toLowerCase();
  const bagNames = new Map(bags.map((bag) => [bag.id, bag.name.toLowerCase()]));

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

    if (filters.outstanding && ["packed", "not-taking"].includes(item.status)) {
      return false;
    }

    if (filters.bagId === UNASSIGNED_BAG_FILTER && item.bagId) {
      return false;
    }

    if (
      filters.bagId &&
      filters.bagId !== UNASSIGNED_BAG_FILTER &&
      item.bagId !== filters.bagId
    ) {
      return false;
    }

    const searchableText = [
      item.name,
      item.notes ?? "",
      item.category,
      item.bagId ? bagNames.get(item.bagId) ?? "" : "",
    ]
      .join(" ")
      .toLowerCase();
    if (search && !searchableText.includes(search)) {
      return false;
    }

    return true;
  });
}

export function normaliseCategory(category: string) {
  return category.trim().toLowerCase().replace(/\s+/g, "-");
}

export function formatPackingLabel(value: string) {
  return value.replace(/-/g, " ");
}

export function getPackingStatusLabel(status: PackingStatus) {
  return (
    packingStatusOptions.find((option) => option.value === status)?.label ??
    formatPackingLabel(status)
  );
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

function buildPersonGroups(items: PackingItem[], travellers: Traveller[]) {
  const travellerGroups = travellers
    .filter((traveller) => !traveller.archivedAt)
    .map((traveller) =>
      createPackingGroup({
        id: `person:${traveller.id}`,
        items: items.filter(
          (item) =>
            item.ownershipScope === "traveller" &&
            item.ownerTravellerId === traveller.id,
        ),
        title: traveller.name,
        quickAddDefault: {
          ownershipScope: "traveller",
          ownerTravellerId: traveller.id,
        },
      }),
    );
  const knownTravellerIds = new Set(travellers.map((traveller) => traveller.id));
  const unknownTravellerItems = items.filter(
    (item) =>
      item.ownershipScope === "traveller" &&
      (!item.ownerTravellerId || !knownTravellerIds.has(item.ownerTravellerId)),
  );

  return [
    ...travellerGroups,
    createPackingGroup({
      id: "person:shared",
      items: items.filter((item) => item.ownershipScope === "shared"),
      title: "Shared Family",
      quickAddDefault: { ownershipScope: "shared" },
    }),
    createPackingGroup({
      id: "person:unassigned",
      items: items.filter((item) => item.ownershipScope === "unassigned"),
      title: "Unknown or Unassigned",
      quickAddDefault: { ownershipScope: "unassigned" },
    }),
    createPackingGroup({
      id: "person:unknown",
      items: unknownTravellerItems,
      title: "Unknown traveller",
      quickAddDefault: { ownershipScope: "unassigned" },
    }),
  ].filter((group) => group.items.length > 0 || group.id !== "person:unknown");
}

function buildCategoryGroups(items: PackingItem[]) {
  const categories = [...new Set(items.map((item) => item.category || "misc"))].sort();
  return categories.map((category) =>
    createPackingGroup({
      id: `category:${category}`,
      items: items.filter((item) => (item.category || "misc") === category),
      title: formatPackingLabel(category),
      subtitle: `${items.filter((item) => (item.category || "misc") === category).length} items`,
      quickAddDefault: { ownershipScope: "unassigned", category },
    }),
  );
}

function buildBagGroups(
  items: PackingItem[],
  bags: Bag[],
  travellers: Traveller[],
) {
  const travellerNames = new Map(travellers.map((traveller) => [traveller.id, traveller.name]));
  const bagGroups = bags
    .filter((bag) => !bag.archivedAt)
    .map((bag) =>
      createPackingGroup({
        id: `bag:${bag.id}`,
        items: items.filter((item) => item.bagId === bag.id),
        title: bag.name,
        subtitle: bag.ownerTravellerId
          ? `Owner: ${travellerNames.get(bag.ownerTravellerId) ?? "Unknown traveller"}`
          : undefined,
        quickAddDefault: { ownershipScope: "unassigned", bagId: bag.id },
      }),
    );
  const knownBagIds = new Set(bags.map((bag) => bag.id));
  const missingBagItems = items.filter(
    (item) => item.bagId && !knownBagIds.has(item.bagId),
  );

  return [
    ...bagGroups,
    createPackingGroup({
      id: "bag:unassigned",
      items: items.filter((item) => !item.bagId),
      title: "No bag assigned",
      quickAddDefault: { ownershipScope: "unassigned" },
    }),
    createPackingGroup({
      id: "bag:missing",
      items: missingBagItems,
      title: "Bag unavailable",
      quickAddDefault: { ownershipScope: "unassigned" },
    }),
  ].filter((group) => group.items.length > 0 || group.id === "bag:unassigned");
}

function buildActionGroups(items: PackingItem[]) {
  const packableItems = items.filter((item) => item.status !== "not-taking");
  const actionDefinitions: {
    id: string;
    title: string;
    items: PackingItem[];
    quickAddDefault?: QuickAddContextDefault;
  }[] = [
    {
      id: "to-buy",
      title: "To buy",
      items: items.filter((item) => item.status === "to-buy"),
      quickAddDefault: { ownershipScope: "unassigned", status: "to-buy" },
    },
    {
      id: "to-wash",
      title: "To wash",
      items: items.filter((item) => item.status === "to-wash"),
      quickAddDefault: { ownershipScope: "unassigned", status: "to-wash" },
    },
    {
      id: "to-charge",
      title: "To charge",
      items: items.filter((item) => item.status === "to-charge"),
      quickAddDefault: { ownershipScope: "unassigned", status: "to-charge" },
    },
    {
      id: "to-download",
      title: "To download",
      items: items.filter((item) => item.status === "to-download"),
      quickAddDefault: { ownershipScope: "unassigned", status: "to-download" },
    },
    {
      id: "to-decide",
      title: "To decide",
      items: items.filter((item) => item.status === "to-decide"),
      quickAddDefault: { ownershipScope: "unassigned", status: "to-decide" },
    },
    {
      id: "essentials-not-packed",
      title: "Essentials not packed",
      items: packableItems.filter(
        (item) => item.priority === "essential" && item.status !== "packed",
      ),
    },
    {
      id: "no-bag",
      title: "No bag assigned",
      items: packableItems.filter((item) => !item.bagId),
    },
    {
      id: "forgotten-risk",
      title: "Forgotten risk",
      items: packableItems.filter(
        (item) => item.forgottenRisk && item.status !== "packed",
      ),
    },
    {
      id: "needed-outstanding",
      title: "Needed / outstanding",
      items: packableItems.filter(
        (item) => item.status === "needed" || item.status === "ready",
      ),
      quickAddDefault: { ownershipScope: "unassigned", status: "needed" },
    },
  ];

  return actionDefinitions
    .map((definition) =>
      createPackingGroup({
        id: `action:${definition.id}`,
        items: definition.items,
        title: definition.title,
        quickAddDefault: definition.quickAddDefault,
      }),
    )
    .filter((group) => group.items.length > 0);
}

function createPackingGroup({
  id,
  items,
  quickAddDefault,
  subtitle,
  title,
}: {
  id: string;
  items: PackingItem[];
  quickAddDefault?: QuickAddContextDefault;
  subtitle?: string;
  title: string;
}): PackingGroup {
  const progress = calculatePackingProgress(items);
  const packableItems = items.filter((item) => item.status !== "not-taking");
  return {
    id,
    title,
    subtitle,
    items,
    progress,
    outstandingCount: progress.packableCount - progress.packedCount,
    essentialOutstandingCount: packableItems.filter(
      (item) => item.priority === "essential" && item.status !== "packed",
    ).length,
    actionCount: packableItems.filter((item) =>
      ["to-buy", "to-wash", "to-charge", "to-download", "to-decide"].includes(
        item.status,
      ),
    ).length,
    quickAddDefault,
  };
}
