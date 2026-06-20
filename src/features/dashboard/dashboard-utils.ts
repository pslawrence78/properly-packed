import type {
  Bag,
  Outfit,
  OutfitItem,
  PackingItem,
  PreTripTask,
  Traveller,
} from "../../db/types";
import { calculateBagProgress } from "../bags/bag-utils";
import { findMissingDependencies } from "../../db/repositories/gadget-bundles-repository";
import { calculateOutfitProgress } from "../outfits/outfit-utils";
import { calculatePackingProgress } from "../packing-items/packing-item-utils";

export type DashboardActionCounts = {
  toBuy: number;
  toWash: number;
  toCharge: number;
  toDownload: number;
  toDecide: number;
};

export type TravellerReadiness = {
  travellerId: string;
  travellerName: string;
  packedCount: number;
  packableCount: number;
  percentPacked: number;
  outstandingCount: number;
  essentialOutstandingCount: number;
};

export type BagReadiness = {
  bagId?: string;
  bagName: string;
  packedCount: number;
  packableCount: number;
  percentPacked: number;
  outstandingCount: number;
  essentialOutstandingCount: number;
  isHandLuggage?: boolean;
  isTravelDay?: boolean;
  isCruiseEmbarkation?: boolean;
};

export type ReadinessLabel =
  | "Not started"
  | "Started"
  | "Needs attention"
  | "Nearly ready"
  | "Ready"
  | "Essentials missing"
  | "Actions outstanding";

export type DashboardReadiness = {
  overall: ReturnType<typeof calculatePackingProgress>;
  actionCounts: DashboardActionCounts;
  essentialsNotPacked: PackingItem[];
  includedItemCount: number;
  notTakingCount: number;
  openTaskCount: number;
  itemsWithNoBag: PackingItem[];
  travelDayItemsOutstanding: PackingItem[];
  forgottenRiskItemsOutstanding: PackingItem[];
  missingDependencyCount: number;
  unassignedCount: number;
  unassignedEssentialItems: PackingItem[];
  travellerReadiness: TravellerReadiness[];
  sharedReadiness: TravellerReadiness;
  bagReadiness: BagReadiness[];
  outfitSummary: ReturnType<typeof calculateOutfitProgress>;
  canMarkReady: boolean;
  label: ReadinessLabel;
};

export function buildDashboardReadiness({
  bags,
  outfitItems,
  outfits,
  packingItems,
  preTripTasks = [],
  travellers,
}: {
  bags: Bag[];
  outfitItems: OutfitItem[];
  outfits: Outfit[];
  packingItems: PackingItem[];
  preTripTasks?: PreTripTask[];
  travellers: Traveller[];
}): DashboardReadiness {
  const activeItems = packingItems.filter((item) => !item.archivedAt);
  const activeBags = bags.filter((bag) => !bag.archivedAt);
  const activeTravellers = travellers.filter((traveller) => !traveller.archivedAt);
  const packableItems = activeItems.filter((item) => item.status !== "not-taking");
  const essentialsNotPacked = packableItems.filter(
    (item) => item.priority === "essential" && item.status !== "packed",
  );
  const actionCounts = countActionStatuses(activeItems);
  const openTaskCount = preTripTasks.filter((task) => task.status === "open").length;
  const missingDependencyCount = findMissingDependencies(activeItems).length;
  const unassignedItems = packableItems.filter(
    (item) => item.ownershipScope === "unassigned",
  );
  const unassignedEssentialItems = unassignedItems.filter(
    (item) => item.priority === "essential",
  );
  const itemsWithNoBag = packableItems.filter((item) => !item.bagId);
  const travelDayItemsOutstanding = packableItems.filter(
    (item) => item.status !== "packed" && item.flags.includes("travel-day"),
  );
  const forgottenRiskItemsOutstanding = packableItems.filter(
    (item) => item.status !== "packed" && item.forgottenRisk,
  );
  const overall = calculatePackingProgress(activeItems);
  const canMarkReady =
    overall.packableCount > 0 &&
    overall.packedCount === overall.packableCount &&
    essentialsNotPacked.length === 0 &&
    missingDependencyCount === 0 &&
    unassignedEssentialItems.length === 0 &&
    openTaskCount === 0;

  return {
    overall,
    actionCounts,
    essentialsNotPacked,
    includedItemCount: packableItems.length,
    notTakingCount: activeItems.length - packableItems.length,
    openTaskCount,
    itemsWithNoBag,
    travelDayItemsOutstanding,
    forgottenRiskItemsOutstanding,
    missingDependencyCount,
    unassignedCount: unassignedItems.length,
    unassignedEssentialItems,
    travellerReadiness: buildTravellerReadiness(activeTravellers, activeItems),
    sharedReadiness: buildSharedReadiness(activeItems),
    bagReadiness: buildBagReadiness(activeBags, activeItems),
    outfitSummary: calculateOutfitProgress(outfits, outfitItems),
    canMarkReady,
    label: getReadinessLabel({
      actionCount: Object.values(actionCounts).reduce((total, count) => total + count, 0),
      canMarkReady,
      essentialsOutstanding: essentialsNotPacked.length,
      openTaskCount,
      overall,
    }),
  };
}

export function getReadinessLabel({
  actionCount,
  canMarkReady,
  essentialsOutstanding,
  openTaskCount,
  overall,
}: {
  actionCount: number;
  canMarkReady: boolean;
  essentialsOutstanding: number;
  openTaskCount: number;
  overall: ReturnType<typeof calculatePackingProgress>;
}): ReadinessLabel {
  if (overall.packableCount === 0) return "Not started";
  if (essentialsOutstanding > 0) return "Essentials missing";
  if (canMarkReady) return "Ready";
  if (actionCount > 0 || openTaskCount > 0) return "Actions outstanding";
  if (overall.percentPacked >= 80) return "Nearly ready";
  if (overall.percentPacked >= 40) return "Needs attention";
  return "Started";
}

export function countActionStatuses(items: Pick<PackingItem, "status">[]): DashboardActionCounts {
  return {
    toBuy: items.filter((item) => item.status === "to-buy").length,
    toWash: items.filter((item) => item.status === "to-wash").length,
    toCharge: items.filter((item) => item.status === "to-charge").length,
    toDownload: items.filter((item) => item.status === "to-download").length,
    toDecide: items.filter((item) => item.status === "to-decide").length,
  };
}

export function buildTravellerReadiness(
  travellers: Traveller[],
  items: PackingItem[],
): TravellerReadiness[] {
  return travellers.map((traveller) => {
    const travellerItems = items.filter(
      (item) =>
        item.ownershipScope === "traveller" &&
        item.ownerTravellerId === traveller.id &&
        item.status !== "not-taking",
    );
    const packedCount = travellerItems.filter((item) => item.status === "packed").length;
    const packableCount = travellerItems.length;

    return {
      travellerId: traveller.id,
      travellerName: traveller.name,
      packedCount,
      packableCount,
      percentPacked:
        packableCount === 0 ? 0 : Math.round((packedCount / packableCount) * 100),
      outstandingCount: packableCount - packedCount,
      essentialOutstandingCount: travellerItems.filter(
        (item) => item.priority === "essential" && item.status !== "packed",
      ).length,
    };
  });
}

export function buildSharedReadiness(items: PackingItem[]): TravellerReadiness {
  const sharedItems = items.filter(
    (item) => item.ownershipScope === "shared" && item.status !== "not-taking",
  );
  const packedCount = sharedItems.filter((item) => item.status === "packed").length;
  const packableCount = sharedItems.length;

  return {
    travellerId: "shared",
    travellerName: "Shared",
    packedCount,
    packableCount,
    percentPacked:
      packableCount === 0 ? 0 : Math.round((packedCount / packableCount) * 100),
    outstandingCount: packableCount - packedCount,
    essentialOutstandingCount: sharedItems.filter(
      (item) => item.priority === "essential" && item.status !== "packed",
    ).length,
  };
}

export function buildBagReadiness(bags: Bag[], items: PackingItem[]): BagReadiness[] {
  const bagReadiness = bags.map((bag) => {
    const progress = calculateBagProgress(items, bag.id);
    return {
      bagId: bag.id,
      bagName: bag.name,
      packedCount: progress.packedCount,
      packableCount: progress.packableCount,
      percentPacked: progress.percentPacked,
      outstandingCount: progress.packableCount - progress.packedCount,
      essentialOutstandingCount: items.filter(
        (item) =>
          item.bagId === bag.id &&
          item.status !== "not-taking" &&
          item.status !== "packed" &&
          item.priority === "essential",
      ).length,
      isHandLuggage: bag.isHandLuggage,
      isTravelDay: bag.isTravelDay,
      isCruiseEmbarkation: bag.isCruiseEmbarkation,
    };
  });
  const unassignedProgress = calculateBagProgress(items);

  return [
    ...bagReadiness,
    {
      bagName: "Unassigned",
      packedCount: unassignedProgress.packedCount,
      packableCount: unassignedProgress.packableCount,
      percentPacked: unassignedProgress.percentPacked,
      outstandingCount: unassignedProgress.packableCount - unassignedProgress.packedCount,
      essentialOutstandingCount: items.filter(
        (item) => !item.bagId && item.status !== "not-taking" && item.status !== "packed" && item.priority === "essential",
      ).length,
    },
  ].filter((entry) => entry.packableCount > 0);
}
