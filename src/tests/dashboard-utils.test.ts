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
    expect(readiness.unassignedCount).toBe(0);
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
    expect(readiness.canMarkReady).toBe(false);
    expect(readiness.label).toBe("Not started");
  });

  it("groups shared items separately from named traveller readiness", () => {
    const readiness = buildDashboardReadiness({
      bags: [],
      outfitItems: [],
      outfits: [],
      packingItems: [
        item("item:1", "Passports", "essential", "packed", undefined, undefined, "shared"),
      ],
      travellers: [traveller("traveller:alex", "Alex")],
    });

    expect(readiness.travellerReadiness).toMatchObject([
      { travellerName: "Alex", packableCount: 0 },
    ]);
    expect(readiness.sharedReadiness).toMatchObject({
      travellerName: "Shared",
      packedCount: 1,
      packableCount: 1,
      percentPacked: 100,
    });
  });

  it("blocks readiness when essential items have unassigned ownership", () => {
    const readiness = buildDashboardReadiness({
      bags: [],
      outfitItems: [],
      outfits: [],
      packingItems: [
        item("item:1", "Medication", "essential", "packed", undefined, undefined, "unassigned"),
      ],
      travellers: [],
    });

    expect(readiness.unassignedCount).toBe(1);
    expect(readiness.unassignedEssentialItems).toMatchObject([{ name: "Medication" }]);
    expect(readiness.canMarkReady).toBe(false);
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

  it("separates open generated tasks from packing actions", () => {
    const readiness = buildDashboardReadiness({
      bags: [], outfitItems: [], outfits: [],
      packingItems: [{ ...item("item:1", "Camera", "important", "packed", "traveller:beck"), source: "gadget-bundle" }],
      preTripTasks: [{
        id: "task:1", tripId: "trip:1", relatedItemId: "item:1", taskName: "Charge camera",
        taskType: "charge", status: "open", createdAt: "2026-06-16T00:00:00.000Z", updatedAt: "2026-06-16T00:00:00.000Z",
      }],
      travellers: [traveller("traveller:beck", "Beck")],
    });

    expect(readiness.openTaskCount).toBe(1);
    expect(readiness.label).toBe("Actions outstanding");
    expect(readiness.canMarkReady).toBe(false);
  });

  it("reports no-bag and risk slices and ignores archived records", () => {
    const archived = { ...item("item:old", "Old item", "essential", "needed"), archivedAt: "2026-06-17T00:00:00.000Z" };
    const risky = { ...item("item:risk", "Medication", "essential", "needed", "traveller:beck"), forgottenRisk: true, flags: ["travel-day"] };
    const readiness = buildDashboardReadiness({
      bags: [], outfitItems: [], outfits: [], packingItems: [archived, risky],
      travellers: [traveller("traveller:beck", "Beck")],
    });

    expect(readiness.includedItemCount).toBe(1);
    expect(readiness.itemsWithNoBag).toMatchObject([{ name: "Medication" }]);
    expect(readiness.travelDayItemsOutstanding).toHaveLength(1);
    expect(readiness.forgottenRiskItemsOutstanding).toHaveLength(1);
    expect(readiness.travellerReadiness[0]).toMatchObject({ outstandingCount: 1, essentialOutstandingCount: 1 });
  });

  it("labels a fully packed trip ready", () => {
    const readiness = buildDashboardReadiness({
      bags: [], outfitItems: [], outfits: [],
      packingItems: [item("item:1", "Passport", "essential", "packed", "traveller:beck")],
      travellers: [traveller("traveller:beck", "Beck")],
    });
    expect(readiness.label).toBe("Ready");
    expect(readiness.canMarkReady).toBe(true);
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
  ownerTravellerId?: string,
  bagId?: string,
  ownershipScope: PackingItem["ownershipScope"] = "traveller",
): PackingItem {
  return {
    id,
    tripId: "trip:1",
    name,
    ownershipScope,
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
