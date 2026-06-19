import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Outfit, OutfitItem, Traveller, Trip } from "../db/types";

const mocks = vi.hoisted(() => ({
  deleteOutfit: vi.fn().mockResolvedValue(undefined),
  deleteOutfitItem: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../db", () => ({ ensureDatabaseReady: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../db/repositories/outfits-repository", () => ({
  createOutfit: vi.fn().mockResolvedValue(undefined),
  createOutfitItem: vi.fn().mockResolvedValue(undefined),
  deleteOutfit: mocks.deleteOutfit,
  deleteOutfitItem: mocks.deleteOutfitItem,
  listOutfitsForTrip: vi.fn().mockResolvedValue([outfit()]),
  listOutfitItemsForTrip: vi.fn().mockResolvedValue([outfitItem()]),
  updateOutfit: vi.fn().mockResolvedValue(undefined),
  updateOutfitItem: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../db/repositories/packing-items-repository", () => ({
  listPackingItemsForTrip: vi.fn().mockResolvedValue([]),
}));
vi.mock("../db/repositories/trips-repository", () => ({
  getTrip: vi.fn().mockResolvedValue(trip()),
}));
vi.mock("../db/repositories/travellers-repository", () => ({
  listTravellers: vi.fn().mockResolvedValue([traveller()]),
}));

import { OutfitPlannerScreen } from "../features/outfits/OutfitPlannerScreen";

const originalConfirm = window.confirm;

beforeEach(() => {
  mocks.deleteOutfit.mockClear();
  mocks.deleteOutfitItem.mockClear();
});

afterEach(() => {
  Object.defineProperty(window, "confirm", {
    configurable: true,
    value: originalConfirm,
    writable: true,
  });
});

describe("OutfitPlannerScreen safe deletion", () => {
  it("cancels and confirms outfit deletion without changing linked packing items", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderScreen();

    const deleteButtons = await screen.findAllByRole("button", { name: "Delete" });
    await user.click(deleteButtons[0]);
    expect(confirm).toHaveBeenCalledWith(
      expect.stringMatching(/Evening outfit.*Linked packing items will not be changed/i),
    );
    expect(mocks.deleteOutfit).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await user.click(deleteButtons[0]);
    await waitFor(() => expect(mocks.deleteOutfit).toHaveBeenCalledWith("outfit:evening"));
  });

  it("cancels and confirms outfit-item deletion without changing its packing item", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderScreen();

    const deleteButtons = await screen.findAllByRole("button", { name: "Delete" });
    await user.click(deleteButtons[1]);
    expect(confirm).toHaveBeenCalledWith(
      expect.stringMatching(/Travel shoes.*linked packing item will not be changed/i),
    );
    expect(mocks.deleteOutfitItem).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await user.click(deleteButtons[1]);
    await waitFor(() =>
      expect(mocks.deleteOutfitItem).toHaveBeenCalledWith("outfit-item:shoes"),
    );
  });
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={["/trips/trip:city/outfits"]}>
      <Routes>
        <Route path="/trips/:tripId/outfits" element={<OutfitPlannerScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

function outfit(): Outfit {
  return {
    id: "outfit:evening",
    tripId: "trip:city",
    ownerTravellerId: "traveller:adult",
    name: "Evening outfit",
    outfitType: "evening",
    status: "planned",
    rewearEligible: false,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

function outfitItem(): OutfitItem {
  return {
    id: "outfit-item:shoes",
    outfitId: "outfit:evening",
    packingItemId: "packing-item:shoes",
    name: "Travel shoes",
    itemType: "shoes",
    status: "needed",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

function traveller(): Traveller {
  return {
    id: "traveller:adult",
    name: "Adult traveller",
    travellerType: "adult",
    defaultIncluded: true,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

function trip(): Trip {
  return {
    id: "trip:city",
    name: "City break",
    tripType: "city-break",
    startDate: "2026-08-01",
    endDate: "2026-08-04",
    nights: 3,
    destinations: ["York"],
    climateContextIds: [],
    accommodationContextIds: [],
    transportContextIds: [],
    activityContextIds: [],
    accommodationTypes: ["hotel"],
    transportModes: ["train"],
    activityContexts: [],
    travellerIds: ["traveller:adult"],
    status: "planning",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}
