import { describe, expect, it } from "vitest";
import { buildDashboardReadiness } from "../features/dashboard/dashboard-utils";
import {
  beachHolidayFixture,
  coldWeatherFixture,
  flyCruiseFixture,
  type RealisticTripFixture,
  staycationWithAlbertFixture,
  themeParkFixture,
} from "../test-utils/realistic-trip-fixtures";
import {
  buildPackingGroups,
  calculatePackingProgress,
  filterPackingItems,
} from "../features/packing-items/packing-item-utils";

describe("realistic trip fixtures", () => {
  it("covers a prepared beach holiday with truthful readiness blockers", () => {
    const readiness = readinessFor(beachHolidayFixture);

    expect(beachHolidayFixture.trip.tripType).toBe("beach-holiday");
    expect(readiness.essentialsNotPacked.map((item) => item.name)).toEqual(
      expect.arrayContaining(["Passports", "Boarding passes", "Sun cream"]),
    );
    expect(readiness.actionCounts).toMatchObject({ toBuy: 1, toCharge: 1, toDownload: 1 });
    expect(readiness.canMarkReady).toBe(false);
  });

  it("covers a fly-cruise with 30+ items, similar cables and cruise actions", () => {
    const readiness = readinessFor(flyCruiseFixture);

    expect(flyCruiseFixture.items.length).toBeGreaterThanOrEqual(30);
    expect(flyCruiseFixture.bags.length).toBeGreaterThanOrEqual(5);
    expect(new Set(flyCruiseFixture.items.map((item) => item.category)).size).toBeGreaterThanOrEqual(5);
    expect(flyCruiseFixture.items.map((item) => item.name)).toEqual(
      expect.arrayContaining([
        "USB-C cable",
        "USB-C cable for iPad",
        "USB-C cable for power bank",
        "Cruise luggage labels",
        "Embarkation snacks",
      ]),
    );
    expect(readiness.canMarkReady).toBe(false);
    expect(readiness.actionCounts).toMatchObject({
      toBuy: 4,
      toCharge: 3,
      toDownload: 2,
      toDecide: 1,
    });
    expect(readiness.itemsWithNoBag.map((item) => item.name)).toEqual(
      expect.arrayContaining(["Cruise luggage labels", "Cruise app login"]),
    );
  });

  it("keeps Albert scoped to the staycation fixture", () => {
    const staycationGroups = buildPackingGroups({
      bags: staycationWithAlbertFixture.bags,
      items: staycationWithAlbertFixture.items,
      travellers: staycationWithAlbertFixture.travellers,
      viewMode: "person",
    });
    const beachGroups = buildPackingGroups({
      bags: beachHolidayFixture.bags,
      items: beachHolidayFixture.items,
      travellers: beachHolidayFixture.travellers,
      viewMode: "person",
    });

    expect(staycationGroups.map((group) => group.title)).toContain("Albert");
    expect(beachGroups.map((group) => group.title)).not.toContain("Albert");
    expect(staycationWithAlbertFixture.items.filter((item) => item.category === "dog")).toHaveLength(5);
  });

  it("surfaces theme park action items by action view and updates progress", () => {
    const actionGroups = buildPackingGroups({
      bags: themeParkFixture.bags,
      items: themeParkFixture.items,
      travellers: themeParkFixture.travellers,
      viewMode: "action",
    });
    const packedProgress = calculatePackingProgress(
      themeParkFixture.items.map((item) => ({ ...item, status: "packed" as const })),
    );

    expect(actionGroups.map((group) => group.title)).toEqual(
      expect.arrayContaining(["To buy", "To charge", "Needed / outstanding"]),
    );
    expect(packedProgress.percentPacked).toBe(100);
  });

  it("keeps cold-weather essentials and no-bag slices visible", () => {
    const readiness = readinessFor(coldWeatherFixture);
    const essentialOutstanding = filterPackingItems(
      coldWeatherFixture.items,
      {
        ownerTravellerId: "",
        category: "",
        status: "",
        priority: "essential",
        bagId: "",
        search: "",
        outstanding: true,
      },
      coldWeatherFixture.bags,
    );

    expect(readiness.label).toBe("Essentials missing");
    expect(readiness.itemsWithNoBag.map((item) => item.name)).toContain("Lip balm");
    expect(essentialOutstanding.map((item) => item.name)).toEqual(
      expect.arrayContaining(["Passports", "Thermals", "Snow boots"]),
    );
  });
});

function readinessFor(fixture: RealisticTripFixture) {
  return buildDashboardReadiness({
    bags: fixture.bags,
    outfitItems: [],
    outfits: [],
    packingItems: fixture.items,
    travellers: fixture.travellers.filter((traveller) =>
      fixture.trip.travellerIds.includes(traveller.id),
    ),
  });
}
