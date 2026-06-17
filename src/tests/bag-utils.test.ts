import { describe, expect, it } from "vitest";
import type { PackingItem } from "../db/types";
import { calculateBagProgress, listItemsForBag } from "../features/bags/bag-utils";

function item(overrides: Partial<PackingItem>): PackingItem {
  return {
    id: overrides.id ?? "item:1",
    tripId: "trip:1",
    name: overrides.name ?? "Passport",
    ownershipScope: "traveller",
    ownerTravellerId: "traveller:phil",
    category: "documents",
    quantity: 1,
    priority: "essential",
    status: overrides.status ?? "needed",
    bagId: overrides.bagId,
    flags: [],
    dependencyItemIds: [],
    source: "manual",
    forgottenRisk: false,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

describe("bag utilities", () => {
  it("calculates bag progress excluding not-taking items", () => {
    expect(
      calculateBagProgress(
        [
          item({ bagId: "bag:1", status: "packed" }),
          item({ bagId: "bag:1", status: "needed" }),
          item({ bagId: "bag:1", status: "not-taking" }),
          item({ bagId: "bag:2", status: "packed" }),
        ],
        "bag:1",
      ),
    ).toEqual({
      bagId: "bag:1",
      packedCount: 1,
      packableCount: 2,
      notTakingCount: 1,
      percentPacked: 50,
    });
  });

  it("lists unassigned items", () => {
    const unassigned = item({ id: "item:unassigned" });
    const assigned = item({ id: "item:assigned", bagId: "bag:1" });

    expect(listItemsForBag([unassigned, assigned])).toEqual([unassigned]);
  });
});
