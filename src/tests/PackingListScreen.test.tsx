import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Bag, PackingItem, Traveller } from "../db/types";

const mocks = vi.hoisted(() => ({
  items: [] as PackingItem[],
  bags: [] as Bag[],
  createPackingItem: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../db", () => ({ ensureDatabaseReady: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../db/repositories/app-settings-repository", () => ({
  getSetting: vi.fn().mockResolvedValue({ value: ["documents", "misc"] }),
}));
vi.mock("../db/repositories/bags-repository", () => ({
  listBagsForTrip: vi.fn(async () => [...mocks.bags]),
}));
vi.mock("../db/repositories/trips-repository", () => ({
  getTrip: vi.fn().mockResolvedValue({ id: "trip:1", name: "City break" }),
}));
vi.mock("../db/repositories/travellers-repository", () => ({
  listTravellers: vi.fn().mockResolvedValue([
    {
      id: "traveller:alex",
      name: "Alex",
      travellerType: "adult",
      defaultIncluded: true,
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:00.000Z",
    } satisfies Traveller,
  ]),
}));
vi.mock("../db/repositories/packing-items-repository", () => ({
  archivePackingItem: vi.fn().mockResolvedValue(undefined),
  createPackingItem: mocks.createPackingItem,
  listPackingItemsForTrip: vi.fn(async () => [...mocks.items]),
  updatePackingItem: vi.fn().mockResolvedValue(undefined),
  updatePackingItemStatus: vi.fn().mockResolvedValue(undefined),
}));

import { PackingListScreen } from "../features/packing-items/PackingListScreen";

describe("PackingListScreen", () => {
  beforeEach(() => {
    mocks.items = [];
    mocks.bags = [];
    mocks.createPackingItem.mockClear();
  });

  it("renders the helpful empty state and creates an unassigned quick-add item", async () => {
    const user = userEvent.setup();
    renderScreen();

    expect(await screen.findByRole("heading", { name: "No packing items yet" })).toBeInTheDocument();
    expect(screen.getByText(/assign each item to a traveller, mark it as shared/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Item name"), "Passport");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(mocks.createPackingItem).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Passport",
        ownershipScope: "unassigned",
        status: "needed",
        quantity: 1,
      }),
    );
  });

  it("shows named traveller, Shared and Unassigned filters and item labels", async () => {
    mocks.items = [
      packingItem("traveller", "Passport", "traveller:alex"),
      packingItem("shared", "Travel insurance"),
      packingItem("unassigned", "Mystery cable"),
    ];
    renderScreen();

    expect(await screen.findByRole("heading", { name: "Passport" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Alex/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Shared/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Unassigned/ })).toBeInTheDocument();
    expect(screen.getAllByText(/Shared · documents/)).toHaveLength(1);
    expect(screen.getAllByText(/Unassigned · documents/)).toHaveLength(1);
  });

  it("shows assigned, unassigned and unavailable bag locations clearly", async () => {
    mocks.bags = [bag("bag:main", "Main suitcase")];
    mocks.items = [
      { ...packingItem("unassigned", "Passport"), bagId: "bag:main" },
      packingItem("unassigned", "Sun cream"),
      { ...packingItem("unassigned", "Old cable"), bagId: "bag:missing" },
    ];
    renderScreen();

    expect(await screen.findByText("Bag: Main suitcase")).toBeInTheDocument();
    expect(screen.getByText("Bag: No bag assigned")).toBeInTheDocument();
    expect(screen.getByText("Bag: Bag unavailable")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "No bag assigned" })).toBeInTheDocument();
  });
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={["/trips/trip:1/pack"]}>
      <Routes>
        <Route path="/trips/:tripId/pack" element={<PackingListScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

function packingItem(
  ownershipScope: PackingItem["ownershipScope"],
  name: string,
  ownerTravellerId?: string,
): PackingItem {
  return {
    id: `item:${name}`,
    tripId: "trip:1",
    name,
    ownershipScope,
    ownerTravellerId,
    category: "documents",
    quantity: 1,
    priority: "important",
    status: "needed",
    flags: [],
    dependencyItemIds: [],
    source: "manual",
    forgottenRisk: false,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
  };
}

function bag(id: string, name: string): Bag {
  return {
    id,
    tripId: "trip:1",
    name,
    bagType: "suitcase",
    isHandLuggage: false,
    isTravelDay: false,
    isCruiseEmbarkation: false,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
  };
}
