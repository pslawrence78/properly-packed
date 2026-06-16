import { describe, expect, it } from "vitest";
import type { PackingItem } from "../db/types";
import {
  calculatePackingProgress,
  filterPackingItems,
} from "../features/packing-items/packing-item-utils";

function item(overrides: Partial<PackingItem>): PackingItem {
  return {
    id: overrides.id ?? "item:1",
    tripId: "trip:1",
    name: overrides.name ?? "Passport",
    ownerTravellerId: overrides.ownerTravellerId ?? "traveller:phil",
    category: overrides.category ?? "documents",
    quantity: 1,
    priority: overrides.priority ?? "essential",
    status: overrides.status ?? "needed",
    flags: [],
    dependencyItemIds: [],
    source: "manual",
    forgottenRisk: false,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

describe("packing item utilities", () => {
  it("calculates progress while excluding not-taking items", () => {
    expect(
      calculatePackingProgress([
        item({ status: "packed" }),
        item({ status: "needed" }),
        item({ status: "not-taking" }),
      ]),
    ).toEqual({
      packedCount: 1,
      packableCount: 2,
      notTakingCount: 1,
      percentPacked: 50,
    });
  });

  it("filters by owner, category, status, priority and search", () => {
    const items = [
      item({ id: "1", name: "Passport", status: "packed" }),
      item({
        id: "2",
        name: "Sun cream",
        ownerTravellerId: "traveller:beck",
        category: "toiletries",
        priority: "important",
        status: "needed",
      }),
    ];

    expect(
      filterPackingItems(items, {
        ownerTravellerId: "traveller:beck",
        category: "toiletries",
        status: "needed",
        priority: "important",
        bagId: "",
        search: "sun",
      }),
    ).toEqual([items[1]]);
  });
});
