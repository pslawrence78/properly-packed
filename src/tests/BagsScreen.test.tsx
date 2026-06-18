import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Bag, PackingItem, Traveller } from "../db/types";

const mocks = vi.hoisted(() => ({
  bags: [] as Bag[],
  items: [] as PackingItem[],
  archiveBag: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../db", () => ({ ensureDatabaseReady: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../db/repositories/trips-repository", () => ({
  getTrip: vi.fn().mockResolvedValue({
    id: "trip:1",
    name: "Test trip",
    travellerIds: ["traveller:test-adult"],
  }),
}));
vi.mock("../db/repositories/travellers-repository", () => ({
  listTravellers: vi.fn().mockResolvedValue([
    {
      id: "traveller:test-adult",
      name: "Test Adult",
      travellerType: "adult",
      defaultIncluded: true,
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:00.000Z",
    } satisfies Traveller,
  ]),
}));
vi.mock("../db/repositories/bags-repository", () => ({
  archiveBag: mocks.archiveBag,
  createBag: vi.fn().mockResolvedValue(undefined),
  listBagsForTrip: vi.fn(async () => [...mocks.bags]),
  updateBag: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../db/repositories/packing-items-repository", () => ({
  listPackingItemsForTrip: vi.fn(async () => [...mocks.items]),
}));

import { BagsScreen } from "../features/bags/BagsScreen";

describe("BagsScreen", () => {
  beforeEach(() => {
    mocks.bags = [];
    mocks.items = [];
    mocks.archiveBag.mockClear();
  });

  it("explains that bags are optional and offers a primary add action", async () => {
    renderScreen();
    expect(await screen.findByRole("heading", { name: "No bags yet" })).toBeInTheDocument();
    expect(screen.getByText(/Bags are optional/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add your first bag" })).toBeInTheDocument();
    expect(screen.getByText("No items are waiting for a bag.")).toBeInTheDocument();
  });

  it("shows neutral ownership, counts and progress without treating not-taking as outstanding", async () => {
    mocks.bags = [bag()];
    mocks.items = [
      item("item:packed", "Passport", "packed"),
      item("item:needed", "Jumper", "needed"),
      item("item:not-taking", "Spare shoes", "not-taking"),
    ];
    renderScreen();

    const card = (await screen.findByRole("heading", { name: "Main suitcase" })).closest("article");
    expect(card).not.toBeNull();
    const scoped = within(card!);
    expect(scoped.getByText(/Suitcase · Neutral \/ no owner/)).toBeInTheDocument();
    expect(scoped.getByText("3", { selector: "p" })).toBeInTheDocument();
    expect(scoped.getByText("1 not taking (excluded from outstanding)")).toBeInTheDocument();
    expect(scoped.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    expect(scoped.getByRole("link", { name: "Manage items" })).toHaveAttribute(
      "href",
      "/trips/trip:1/pack?bag=bag:main",
    );
  });

  it("confirms archive consequences before unassigning items", async () => {
    const user = userEvent.setup();
    mocks.bags = [bag()];
    mocks.items = [item("item:needed", "Jumper", "needed")];
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderScreen();

    await user.click(await screen.findByRole("button", { name: "Archive" }));
    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining("1 assigned item will be kept and changed to No bag assigned"),
    );
    expect(mocks.archiveBag).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={["/trips/trip:1/bags"]}>
      <Routes>
        <Route path="/trips/:tripId/bags" element={<BagsScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

function bag(): Bag {
  return {
    id: "bag:main",
    tripId: "trip:1",
    name: "Main suitcase",
    bagType: "suitcase",
    notes: "Blue case by the front door",
    isHandLuggage: false,
    isTravelDay: false,
    isCruiseEmbarkation: false,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
  };
}

function item(id: string, name: string, status: PackingItem["status"]): PackingItem {
  return {
    id,
    tripId: "trip:1",
    name,
    ownershipScope: "unassigned",
    category: "misc",
    quantity: 1,
    priority: "important",
    status,
    bagId: "bag:main",
    flags: [],
    dependencyItemIds: [],
    source: "manual",
    forgottenRisk: false,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
  };
}
