import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Bag, PackingItem, Traveller } from "../db/types";

const mocks = vi.hoisted(() => ({
  items: [] as PackingItem[],
  bags: [] as Bag[],
  tripExists: true,
  createPackingItem: vi.fn().mockResolvedValue(undefined),
  updatePackingItemStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../db", () => ({ ensureDatabaseReady: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../db/repositories/app-settings-repository", () => ({
  getSetting: vi.fn().mockResolvedValue({ value: ["documents", "misc"] }),
}));
vi.mock("../db/repositories/bags-repository", () => ({
  listBagsForTrip: vi.fn(async () => [...mocks.bags]),
}));
vi.mock("../db/repositories/trips-repository", () => ({
  getTrip: vi.fn(async () =>
    mocks.tripExists ? { id: "trip:1", name: "City break" } : undefined,
  ),
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
  updatePackingItemStatus: mocks.updatePackingItemStatus,
}));

import { PackingListScreen } from "../features/packing-items/PackingListScreen";

describe("PackingListScreen", () => {
  beforeEach(() => {
    mocks.items = [];
    mocks.bags = [];
    mocks.tripExists = true;
    mocks.createPackingItem.mockClear();
    mocks.updatePackingItemStatus.mockClear();
  });

  it("renders the helpful empty state and creates an unassigned quick-add item", async () => {
    const user = userEvent.setup();
    renderScreen();

    expect(await screen.findByRole("heading", { name: "No packing items yet" })).toBeInTheDocument();
    expect(screen.getByText(/assign each item to a traveller, mark it as shared/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review suggestions" })).toHaveAttribute(
      "href",
      "/trips/trip:1/starter-pack",
    );

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
    expect(screen.getByRole("heading", { name: "Alex" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Shared Family" })).toBeInTheDocument();
    expect(screen.getAllByText(/Shared \/ documents/)).toHaveLength(1);
    expect(screen.getAllByText(/Unassigned \/ documents/)).toHaveLength(1);
  });

  it("shows assigned, unassigned and unavailable bag locations clearly", async () => {
    mocks.bags = [bag("bag:main", "Main suitcase")];
    mocks.items = [
      { ...packingItem("unassigned", "Passport"), bagId: "bag:main" },
      packingItem("unassigned", "Sun cream"),
      { ...packingItem("unassigned", "Old cable"), bagId: "bag:missing" },
    ];
    renderScreen();

    expect(await screen.findAllByText(/Main suitcase/)).not.toHaveLength(0);
    expect(screen.getAllByText(/No bag assigned/)).not.toHaveLength(0);
    expect(screen.getAllByText(/Bag unavailable/)).not.toHaveLength(0);
    expect(screen.getByRole("option", { name: "No bag assigned" })).toBeInTheDocument();
  });

  it("offers safe recovery when a trip ID does not exist", async () => {
    mocks.tripExists = false;
    renderScreen("/trips/trip:missing/pack");

    expect(
      await screen.findByRole("heading", { name: "Trip not found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Select a trip" })).toHaveAttribute(
      "href",
      "/trips",
    );
    expect(screen.getByRole("link", { name: "Create trip" })).toHaveAttribute(
      "href",
      "/trips/new",
    );
  });

  it("reads dashboard filters, shows them, and clears them", async () => {
    const user = userEvent.setup();
    mocks.items = [
      { ...packingItem("traveller", "Power bank", "traveller:alex"), status: "to-charge" },
      { ...packingItem("traveller", "Packed cable", "traveller:alex"), status: "packed" },
    ];
    renderScreen("/trips/trip:1/pack?owner=traveller:alex&status=to-charge&outstanding=true");

    expect(await screen.findByRole("heading", { name: "Power bank" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Packed cable" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Alex/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Status")).toHaveValue("to-charge");
    expect(screen.getByLabelText("Outstanding items only")).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("heading", { name: "Packed cable" })).toBeInTheDocument();
  });

  it("switches between pack view modes", async () => {
    const user = userEvent.setup();
    mocks.bags = [bag("bag:main", "Main suitcase")];
    mocks.items = [
      {
        ...packingItem("traveller", "Passport", "traveller:alex"),
        category: "documents",
        bagId: "bag:main",
      },
      {
        ...packingItem("shared", "Sun cream"),
        category: "toiletries",
        status: "to-buy",
      },
    ];
    renderScreen();

    expect(await screen.findByRole("button", { name: "By Person" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Alex" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "By Category" }));
    expect(screen.getByRole("heading", { name: "documents" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "By Bag" }));
    expect(screen.getByRole("heading", { name: "Main suitcase" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "By Action" }));
    expect(screen.getByRole("heading", { name: "To buy" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Flat List" }));
    expect(screen.getByRole("heading", { name: "All items" })).toBeInTheDocument();
  });

  it("marks an item packed from a grouped view", async () => {
    const user = userEvent.setup();
    mocks.items = [packingItem("traveller", "Passport", "traveller:alex")];
    renderScreen();

    await user.click(await screen.findByRole("button", { name: "Mark Passport packed" }));
    expect(mocks.updatePackingItemStatus).toHaveBeenCalledWith("item:Passport", "packed");
  });

  it("quick add uses the active group context safely", async () => {
    const user = userEvent.setup();
    mocks.items = [packingItem("traveller", "Passport", "traveller:alex")];
    renderScreen();

    await screen.findByRole("heading", { name: "Alex" });
    await user.click(screen.getAllByRole("button", { name: "Add here" })[0]);
    await user.type(screen.getByLabelText("Item name"), "Socks");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(mocks.createPackingItem).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Socks",
        ownershipScope: "traveller",
        ownerTravellerId: "traveller:alex",
      }),
    );
  });

  it("ignores an invalid status deep link", async () => {
    mocks.items = [packingItem("shared", "Travel insurance")];
    renderScreen("/trips/trip:1/pack?status=not-a-real-status");
    expect(await screen.findByRole("heading", { name: "Travel insurance" })).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toHaveValue("");
  });
});

function renderScreen(path = "/trips/trip:1/pack") {
  return render(
    <MemoryRouter initialEntries={[path]}>
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
