import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Bag, PackingItem, Traveller } from "../db/types";

const mocks = vi.hoisted(() => ({
  items: [] as PackingItem[],
  bags: [] as Bag[],
  categories: ["documents", "misc"] as string[],
  travellers: [
    {
      id: "traveller:alex",
      name: "Alex",
      travellerType: "adult",
      defaultIncluded: true,
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:00.000Z",
    } satisfies Traveller,
  ] as Traveller[],
  tripExists: true,
  createPackingItem: vi.fn(async (input: any) => createdPackingItem(input)),
  listPackingItemsForTrip: vi.fn(async () => [...mocks.items]),
  updatePackingItemStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../db", () => ({ ensureDatabaseReady: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../db/repositories/app-settings-repository", () => ({
  getSetting: vi.fn(async () => ({ value: [...mocks.categories] })),
}));
vi.mock("../db/repositories/bags-repository", () => ({
  listBagsForTrip: vi.fn(async () => [...mocks.bags]),
}));
vi.mock("../db/repositories/trips-repository", () => ({
  getTrip: vi.fn(async () =>
    mocks.tripExists ? { id: "trip:1", name: "City break" } : undefined,
  ),
  resolveActiveTrip: vi.fn(async () =>
    mocks.tripExists
      ? { reason: "ready", tripId: "trip:1", trip: { id: "trip:1", name: "City break" } }
      : { reason: "not-found", tripId: "trip:missing" },
  ),
}));
vi.mock("../db/repositories/travellers-repository", () => ({
  listTravellers: vi.fn(async () => [...mocks.travellers]),
}));
vi.mock("../db/repositories/packing-items-repository", () => ({
  archivePackingItem: vi.fn().mockResolvedValue(undefined),
  createPackingItem: mocks.createPackingItem,
  listPackingItemsForTrip: mocks.listPackingItemsForTrip,
  updatePackingItem: vi.fn().mockResolvedValue(undefined),
  updatePackingItemStatus: mocks.updatePackingItemStatus,
}));

import { PackingListScreen } from "../features/packing-items/PackingListScreen";

describe("PackingListScreen", () => {
  beforeEach(() => {
    mocks.items = [];
    mocks.bags = [];
    mocks.categories = ["documents", "misc"];
    mocks.travellers = [
      {
        id: "traveller:alex",
        name: "Alex",
        travellerType: "adult",
        defaultIncluded: true,
        createdAt: "2026-06-18T00:00:00.000Z",
        updatedAt: "2026-06-18T00:00:00.000Z",
      },
    ];
    mocks.tripExists = true;
    mocks.createPackingItem.mockClear();
    mocks.listPackingItemsForTrip.mockClear();
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

  it("uses the active trip when no trip ID is supplied", async () => {
    mocks.items = [packingItem("shared", "Travel insurance")];
    renderScreen("/pack", "/pack");

    expect(await screen.findByRole("heading", { name: "Travel insurance" })).toBeInTheDocument();
  });

  it("shows recovery when Pack has no route trip and no active trip", async () => {
    mocks.tripExists = false;
    renderScreen("/pack", "/pack");

    expect(
      await screen.findByRole("heading", { name: "Select a trip to pack" }),
    ).toBeInTheDocument();
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

  it("marks an item packed from mid-list without reloading the list tree", async () => {
    const user = userEvent.setup();
    mocks.items = createLongPackingItems(30).map((item) => ({
      ...item,
      ownershipScope: "traveller",
      ownerTravellerId: "traveller:alex",
    }));
    renderScreen("/trips/trip:1/pack?status=needed&outstanding=true");

    expect(await screen.findByRole("heading", { name: "Item 01" })).toBeInTheDocument();
    expect(mocks.listPackingItemsForTrip).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Mark Item 15 packed" }));

    expect(mocks.updatePackingItemStatus).toHaveBeenCalledWith("item:Item 15", "packed");
    expect(mocks.listPackingItemsForTrip).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Loading packing list...")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toHaveValue("needed");
    expect(screen.getByLabelText("Outstanding items only")).toBeChecked();
    expect(screen.getByRole("heading", { name: "Item 16" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark Item 15 packed" })).not.toBeInTheDocument();
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

  it("quick add inserts an item without refetching the packing list", async () => {
    const user = userEvent.setup();
    mocks.items = createLongPackingItems(30).map((item) => ({
      ...item,
      ownershipScope: "traveller",
      ownerTravellerId: "traveller:alex",
    }));
    renderScreen();

    expect(await screen.findByRole("heading", { name: "Alex" })).toBeInTheDocument();
    expect(mocks.listPackingItemsForTrip).toHaveBeenCalledTimes(1);

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
    expect(mocks.listPackingItemsForTrip).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Loading packing list...")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Socks" })).toBeInTheDocument();
  });

  it("drops active group quick-add context after switching view modes", async () => {
    const user = userEvent.setup();
    mocks.items = [packingItem("traveller", "Passport", "traveller:alex")];
    renderScreen();

    await screen.findByRole("heading", { name: "Alex" });
    await user.click(screen.getAllByRole("button", { name: "Add here" })[0]);
    await user.click(screen.getByRole("button", { name: "By Category" }));
    await user.type(screen.getByLabelText("Item name"), "Socks");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(mocks.createPackingItem).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Socks",
        ownershipScope: "unassigned",
        ownerTravellerId: undefined,
      }),
    );
  });

  it("ignores an invalid status deep link", async () => {
    mocks.items = [packingItem("shared", "Travel insurance")];
    renderScreen("/trips/trip:1/pack?status=not-a-real-status");
    expect(await screen.findByRole("heading", { name: "Travel insurance" })).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toHaveValue("");
  });

  it("opens bulk add, previews pasted lines with warnings, and commits included edits", async () => {
    const user = userEvent.setup();
    mocks.categories = ["documents", "electronics", "health", "misc"];
    mocks.bags = [bag("bag:gadget", "Gadget bag")];
    mocks.travellers = [
      traveller("traveller:seb", "Seb", "child"),
      traveller("traveller:phil", "Phil", "adult"),
      traveller("traveller:shared", "Shared Family", "adult"),
    ];
    renderScreen();

    await user.click(await screen.findByRole("button", { name: "Bulk add" }));
    await user.type(
      screen.getByLabelText("Packing list"),
      "Seb: swim goggles\nPhil: power bank / to charge / gadget bag\nMorgan: mystery item / unknown pouch",
    );
    await user.click(screen.getByRole("button", { name: "Preview items" }));

    expect(await screen.findByText("Morgan: mystery item / unknown pouch")).toBeInTheDocument();
    expect(screen.getByText(/Unknown owner "Morgan"/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add 2 items" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Included" })[0]);
    await user.clear(screen.getAllByLabelText("Item name")[2]);
    await user.type(screen.getAllByLabelText("Item name")[2], "large power bank");
    await user.click(screen.getByRole("button", { name: "Add 1 items" }));

    expect(mocks.createPackingItem).toHaveBeenCalledTimes(1);
    expect(mocks.createPackingItem).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "large power bank",
        ownerTravellerId: "traveller:phil",
        status: "to-charge",
        bagId: "bag:gadget",
      }),
    );
  });

  it("does not create items when bulk add is cancelled", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(await screen.findByRole("button", { name: "Bulk add" }));
    await user.type(screen.getByLabelText("Packing list"), "passport");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mocks.createPackingItem).not.toHaveBeenCalled();
  });

  it("defaults duplicate bulk rows to skipped", async () => {
    const user = userEvent.setup();
    mocks.travellers = [traveller("traveller:shared", "Shared Family", "adult")];
    mocks.items = [
      {
        ...packingItem("traveller", "Passport", "traveller:shared"),
        category: "documents",
      },
    ];
    renderScreen();

    await user.click(await screen.findByRole("button", { name: "Bulk add" }));
    await user.type(screen.getByLabelText("Packing list"), "Shared Family: Passport");
    await user.click(screen.getByRole("button", { name: "Preview items" }));

    expect(await screen.findByText(/Matches existing item "Passport"/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skipped" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add 0 items" })).toBeInTheDocument();
  });
});

function renderScreen(path = "/trips/trip:1/pack", routePath = "/trips/:tripId/pack") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={<PackingListScreen />} />
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

function traveller(
  id: string,
  name: string,
  travellerType: Traveller["travellerType"],
): Traveller {
  return {
    id,
    name,
    travellerType,
    defaultIncluded: true,
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

function createLongPackingItems(count: number) {
  return Array.from({ length: count }, (_, index) =>
    packingItem(
      "traveller",
      `Item ${String(index + 1).padStart(2, "0")}`,
      "traveller:alex",
    ),
  );
}

function createdPackingItem(input: any): PackingItem {
  return {
    id: `item:${input.name}`,
    tripId: input.tripId,
    name: input.name,
    ownershipScope: input.ownershipScope,
    ownerTravellerId: input.ownerTravellerId,
    responsibleTravellerId: input.responsibleTravellerId,
    category: input.category,
    quantity: input.quantity,
    priority: input.priority,
    status: input.status,
    bagId: input.bagId,
    notes: input.notes,
    flags: [],
    dependencyItemIds: [],
    source: "manual",
    forgottenRisk: false,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
  };
}
