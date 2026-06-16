import type { Bag, PackingItem } from "../../db/types";

export type BagProgress = {
  bagId?: string;
  packedCount: number;
  packableCount: number;
  notTakingCount: number;
  percentPacked: number;
};

export function calculateBagProgress(
  items: Pick<PackingItem, "bagId" | "status">[],
  bagId?: string,
): BagProgress {
  const matchingItems = items.filter((item) =>
    bagId ? item.bagId === bagId : !item.bagId,
  );
  const notTakingCount = matchingItems.filter(
    (item) => item.status === "not-taking",
  ).length;
  const packableItems = matchingItems.filter(
    (item) => item.status !== "not-taking",
  );
  const packedCount = packableItems.filter(
    (item) => item.status === "packed",
  ).length;

  return {
    bagId,
    packedCount,
    packableCount: packableItems.length,
    notTakingCount,
    percentPacked:
      packableItems.length === 0
        ? 0
        : Math.round((packedCount / packableItems.length) * 100),
  };
}

export function listItemsForBag(items: PackingItem[], bagId?: string) {
  return items.filter((item) => (bagId ? item.bagId === bagId : !item.bagId));
}

export function getBagName(bags: Bag[], bagId?: string) {
  if (!bagId) {
    return "Unassigned";
  }

  return bags.find((bag) => bag.id === bagId)?.name ?? "Unknown bag";
}
