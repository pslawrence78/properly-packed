import { describe, expect, it } from "vitest";
import type { PackingItem } from "../db/types";
import {
  buildPackingGroups,
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

  it("groups packing items by traveller with shared and fallback groups", () => {
    const groups = buildPackingGroups({
      bags: [],
      items: [
        item({ id: "phil", ownerTravellerId: "traveller:phil" }),
        item({ id: "shared", ownershipScope: "shared", ownerTravellerId: undefined }),
        item({ id: "unknown", ownerTravellerId: "traveller:missing" }),
      ],
      travellers: [
        traveller("traveller:phil", "Phil"),
        traveller("traveller:beck", "Beck"),
      ],
      viewMode: "person",
    });

    expect(groups.map((group) => group.title)).toEqual([
      "Phil",
      "Beck",
      "Shared Family",
      "Unknown or Unassigned",
      "Unknown traveller",
    ]);
    expect(groups.find((group) => group.title === "Phil")?.items).toHaveLength(1);
    expect(groups.find((group) => group.title === "Unknown traveller")?.items).toHaveLength(1);
  });

  it("groups packing items by category", () => {
    const groups = buildPackingGroups({
      bags: [],
      items: [
        item({ id: "documents", category: "documents" }),
        item({ id: "toiletries", category: "toiletries" }),
      ],
      travellers: [],
      viewMode: "category",
    });

    expect(groups.map((group) => group.title)).toEqual(["documents", "toiletries"]);
    expect(groups[0].quickAddDefault).toMatchObject({ category: "documents" });
  });

  it("groups packing items by bag including no-bag and missing-bag fallbacks", () => {
    const groups = buildPackingGroups({
      bags: [{ id: "bag:main", name: "Main suitcase", ownerTravellerId: "traveller:phil" }] as never,
      items: [
        item({ id: "bagged", bagId: "bag:main" }),
        item({ id: "unbagged", bagId: undefined }),
        item({ id: "missing", bagId: "bag:missing" }),
      ],
      travellers: [traveller("traveller:phil", "Phil")],
      viewMode: "bag",
    });

    expect(groups.map((group) => group.title)).toEqual([
      "Main suitcase",
      "No bag assigned",
      "Bag unavailable",
    ]);
    expect(groups[0].subtitle).toBe("Owner: Phil");
  });

  it("groups packing items by action status and derived action needs", () => {
    const groups = buildPackingGroups({
      bags: [],
      items: [
        item({ id: "buy", status: "to-buy" }),
        item({ id: "essential", priority: "essential", status: "needed" }),
        item({ id: "risk", forgottenRisk: true, status: "needed" }),
        item({ id: "packed", forgottenRisk: true, priority: "essential", status: "packed" }),
      ],
      travellers: [],
      viewMode: "action",
    });

    expect(groups.map((group) => group.title)).toEqual([
      "To buy",
      "Essentials not packed",
      "No bag assigned",
      "Forgotten risk",
      "Needed / outstanding",
    ]);
    expect(groups.find((group) => group.title === "Essentials not packed")?.items.map((entry) => entry.id)).toEqual([
      "buy",
      "essential",
      "risk",
    ]);
  });

  it("excludes not-taking items from grouped progress", () => {
    const [group] = buildPackingGroups({
      bags: [],
      items: [
        item({ id: "packed", status: "packed" }),
        item({ id: "needed", status: "needed" }),
        item({ id: "skip", status: "not-taking" }),
      ],
      travellers: [],
      viewMode: "flat",
    });

    expect(group.progress).toMatchObject({
      packedCount: 1,
      packableCount: 2,
      notTakingCount: 1,
    });
  });
});

function traveller(id: string, name: string) {
  return {
    id,
    name,
    travellerType: "adult",
    defaultIncluded: true,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  } as const;
}
