import type { Bag, Outfit, OutfitItem, PackingItem, Traveller } from "../../db/types";
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
};

export type BagReadiness = {
  bagId?: string;
  bagName: string;
  packedCount: number;
  packableCount: number;
  percentPacked: number;
};

export type DashboardReadiness = {
  overall: ReturnType<typeof calculatePackingProgress>;
  actionCounts: DashboardActionCounts;
  essentialsNotPacked: PackingItem[];
  missingDependencyCount: number;
  unassignedCount: number;
  travellerReadiness: TravellerReadiness[];
  bagReadiness: BagReadiness[];
  outfitSummary: ReturnType<typeof calculateOutfitProgress>;
  canMarkReady: boolean;
};

export function buildDashboardReadiness({
  bags,
  outfitItems,
  outfits,
  packingItems,
  travellers,
}: {
  bags: Bag[];
  outfitItems: OutfitItem[];
  outfits: Outfit[];
  packingItems: PackingItem[];
  travellers: Traveller[];
}): DashboardReadiness {
  const packableItems = packingItems.filter((item) => item.status !== "not-taking");
  const essentialsNotPacked = packableItems.filter(
    (item) => item.priority === "essential" && item.status !== "packed",
  );
  const actionCounts = countActionStatuses(packingItems);
  const missingDependencyCount = findMissingDependencies(packingItems).length;
  const unassignedCount = packableItems.filter((item) => !item.bagId).length;

  return {
    overall: calculatePackingProgress(packingItems),
    actionCounts,
    essentialsNotPacked,
    missingDependencyCount,
    unassignedCount,
    travellerReadiness: buildTravellerReadiness(travellers, packingItems),
    bagReadiness: buildBagReadiness(bags, packingItems),
    outfitSummary: calculateOutfitProgress(outfits, outfitItems),
    canMarkReady: essentialsNotPacked.length === 0 && missingDependencyCount === 0,
  };
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
      (item) => item.ownerTravellerId === traveller.id && item.status !== "not-taking",
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
    };
  });
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
    },
  ].filter((entry) => entry.packableCount > 0);
}
