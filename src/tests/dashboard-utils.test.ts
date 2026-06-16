import { describe, expect, it } from "vitest";
import type { Bag, Outfit, PackingItem, Traveller } from "../db/types";
import {
  buildDashboardReadiness,
  countActionStatuses,
} from "../features/dashboard/dashboard-utils";

describe("dashboard readiness utilities", () => {
  it("calculates action counts and readiness slices", () => {
    const readiness = buildDashboardReadiness({
      bags: [bag("bag:1", "Cabin bag")],
      outfitItems: [],
      outfits: [outfit("outfit:1", "packed")],
      packingItems: [
        item("item:1", "Passport", "essential", "needed", "traveller:beck", "bag:1"),
        item("item:2", "T-shirt", "important", "packed", "traveller:beck", "bag:1"),
        item("item:3", "Power bank", "important", "to-charge", "traveller:phil"),
        item("item:4", "Offline maps", "useful", "to-download", "traveller:phil"),
      ],
      travellers: [traveller("traveller:beck", "Beck"), traveller("traveller:phil", "Phil")],
    });

    expect(readiness.overall).toMatchObject({
      packedCount: 1,
      packableCount: 4,
      percentPacked: 25,
    });
    expect(readiness.actionCounts).toMatchObject({
      toCharge: 1,
      toDownload: 1,
    });
    expect(readiness.essentialsNotPacked).toMatchObject([{ name: "Passport" }]);
    expect(readiness.unassignedCount).toBe(2);
    expect(readiness.travellerReadiness).toMatchObject([
      { travellerName: "Beck", packedCount: 1, packableCount: 2, percentPacked: 50 },
      { travellerName: "Phil", packedCount: 0, packableCount: 2, percentPacked: 0 },
    ]);
    expect(readiness.bagReadiness).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ bagName: "Cabin bag", percentPacked: 50 }),
        expect.objectContaining({ bagName: "Unassigned", packableCount: 2 }),
      ]),
    );
    expect(readiness.outfitSummary.packedCount).toBe(1);
    expect(readiness.canMarkReady).toBe(false);
  });

  it("ignores not-taking essentials for readiness blockers", () => {
    const readiness = buildDashboardReadiness({
      bags: [],
      outfitItems: [],
      outfits: [],
      packingItems: [
        item("item:1", "Spare passport copy", "essential", "not-taking", "traveller:beck"),
      ],
      travellers: [traveller("traveller:beck", "Beck")],
    });

    expect(readiness.essentialsNotPacked).toEqual([]);
    expect(readiness.canMarkReady).toBe(true);
  });

  it("counts dashboard action statuses", () => {
    expect(
      countActionStatuses([
        { status: "to-buy" },
        { status: "to-wash" },
        { status: "to-charge" },
        { status: "to-download" },
        { status: "to-decide" },
        { status: "packed" },
      ]),
    ).toEqual({
      toBuy: 1,
      toWash: 1,
      toCharge: 1,
      toDownload: 1,
      toDecide: 1,
    });
  });
});

function traveller(id: string, name: string): Traveller {
  return {
    id,
    name,
    travellerType: "adult",
    defaultIncluded: true,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

function bag(id: string, name: string): Bag {
  return {
    id,
    tripId: "trip:1",
    name,
    bagType: "cabin-bag",
    isHandLuggage: true,
    isTravelDay: true,
    isCruiseEmbarkation: false,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

function outfit(id: string, status: Outfit["status"]): Outfit {
  return {
    id,
    tripId: "trip:1",
    ownerTravellerId: "traveller:beck",
    name: id,
    outfitType: "day",
    status,
    rewearEligible: false,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

function item(
  id: string,
  name: string,
  priority: PackingItem["priority"],
  status: PackingItem["status"],
  ownerTravellerId: string,
  bagId?: string,
): PackingItem {
  return {
    id,
    tripId: "trip:1",
    name,
    ownerTravellerId,
    category: "misc",
    quantity: 1,
    priority,
    status,
    bagId,
    flags: [],
    dependencyItemIds: [],
    source: "manual",
    forgottenRisk: false,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}
