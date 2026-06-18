import { describe, expect, it } from "vitest";
import type { PackingItem } from "../db/types";
import {
  calculatePackingProgress,
  filterPackingItems,
  getQuickAddOwnershipDefault,
  SHARED_OWNERSHIP_FILTER,
  UNASSIGNED_OWNERSHIP_FILTER,
} from "../features/packing-items/packing-item-utils";

function item(overrides: Partial<PackingItem>): PackingItem {
  return {
    id: overrides.id ?? "item:1",
    tripId: "trip:1",
    name: overrides.name ?? "Passport",
    ownershipScope: overrides.ownershipScope ?? "traveller",
    ownerTravellerId:
      "ownerTravellerId" in overrides
        ? overrides.ownerTravellerId
        : "traveller:phil",
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
    ...overrides,
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

  it("filters shared and unassigned ownership states", () => {
    const items = [
      item({ id: "1", name: "Travel insurance", ownershipScope: "shared", ownerTravellerId: undefined }),
      item({ id: "2", name: "Mystery cable", ownershipScope: "unassigned", ownerTravellerId: undefined }),
    ];

    expect(
      filterPackingItems(items, {
        ownerTravellerId: SHARED_OWNERSHIP_FILTER,
        category: "",
        status: "",
        priority: "",
        bagId: "",
        search: "",
      }),
    ).toEqual([items[0]]);

    expect(
      filterPackingItems(items, {
        ownerTravellerId: UNASSIGNED_OWNERSHIP_FILTER,
        category: "",
        status: "",
        priority: "",
        bagId: "",
        search: "",
      }),
    ).toEqual([items[1]]);
  });

  it("chooses quick-add ownership from the active ownership filter", () => {
    expect(getQuickAddOwnershipDefault("", ["traveller:phil"])).toEqual({
      ownershipScope: "unassigned",
    });
    expect(
      getQuickAddOwnershipDefault("traveller:phil", ["traveller:phil"]),
    ).toEqual({
      ownershipScope: "traveller",
      ownerTravellerId: "traveller:phil",
    });
    expect(
      getQuickAddOwnershipDefault(SHARED_OWNERSHIP_FILTER, ["traveller:phil"]),
    ).toEqual({ ownershipScope: "shared" });
    expect(
      getQuickAddOwnershipDefault(UNASSIGNED_OWNERSHIP_FILTER, ["traveller:phil"]),
    ).toEqual({ ownershipScope: "unassigned" });
  });

  it("searches notes, categories and bag names", () => {
    const searchable = item({
      notes: "Keep near the tickets",
      category: "travel-documents",
      bagId: "bag:cabin",
    });
    const filters = {
      ownerTravellerId: "",
      category: "",
      status: "",
      priority: "",
      bagId: "",
      search: "",
    };
    const bags = [{ id: "bag:cabin", name: "Blue cabin bag" }] as never;

    expect(filterPackingItems([searchable], { ...filters, search: "tickets" }, bags)).toEqual([searchable]);
    expect(filterPackingItems([searchable], { ...filters, search: "documents" }, bags)).toEqual([searchable]);
    expect(filterPackingItems([searchable], { ...filters, search: "blue cabin" }, bags)).toEqual([searchable]);
  });

  it("filters items with no bag assigned", () => {
    const unbagged = item({ id: "unbagged", bagId: undefined });
    const bagged = item({ id: "bagged", bagId: "bag:main" });
    expect(
      filterPackingItems([unbagged, bagged], {
        ownerTravellerId: "",
        category: "",
        status: "",
        priority: "",
        bagId: "__unassigned",
        search: "",
      }),
    ).toEqual([unbagged]);
  });

  it.each(["to-buy", "to-wash", "to-charge", "to-download", "to-decide"])(
    "filters the %s action status",
    (status) => {
      const matching = item({ status: status as PackingItem["status"] });
      expect(
        filterPackingItems([matching, item({ id: "other", status: "needed" })], {
          ownerTravellerId: "",
          category: "",
          status,
          priority: "",
          bagId: "",
          search: "",
        }),
      ).toEqual([matching]);
    },
  );
});
