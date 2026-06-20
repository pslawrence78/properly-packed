import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Bag, PackingItem, Traveller, Trip } from "../db/types";

const mocks = vi.hoisted(() => ({
  items: [] as PackingItem[],
  suggestionCount: 0,
}));

vi.mock("../db", () => ({ ensureDatabaseReady: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../db/repositories/app-settings-repository", () => ({ getActiveTripId: vi.fn().mockResolvedValue("trip:1") }));
vi.mock("../db/repositories/trips-repository", () => ({
  getTrip: vi.fn().mockResolvedValue({
    id: "trip:1", name: "Fly-cruise", tripType: "fly-cruise", startDate: "2026-07-01", endDate: "2026-07-08",
    nights: 7, destinations: [], climateContextIds: [], accommodationContextIds: [], transportContextIds: [], activityContextIds: [],
    travellerIds: ["traveller:seb"], status: "packing", createdAt: "2026-06-18T00:00:00.000Z", updatedAt: "2026-06-18T00:00:00.000Z",
  } satisfies Trip),
  listTrips: vi.fn().mockResolvedValue([{ id: "trip:1" }]),
}));
vi.mock("../db/repositories/travellers-repository", () => ({ listTravellers: vi.fn().mockResolvedValue([{
  id: "traveller:seb", name: "Seb", travellerType: "child", defaultIncluded: true,
  createdAt: "2026-06-18T00:00:00.000Z", updatedAt: "2026-06-18T00:00:00.000Z",
} satisfies Traveller]) }));
vi.mock("../db/repositories/packing-items-repository", () => ({ listPackingItemsForTrip: vi.fn(async () => [...mocks.items]) }));
vi.mock("../db/repositories/bags-repository", () => ({ listBagsForTrip: vi.fn().mockResolvedValue([{
  id: "bag:cabin", tripId: "trip:1", name: "Cabin bag", bagType: "cabin-bag", isHandLuggage: true, isTravelDay: true,
  isCruiseEmbarkation: false, createdAt: "2026-06-18T00:00:00.000Z", updatedAt: "2026-06-18T00:00:00.000Z",
} satisfies Bag]) }));
vi.mock("../db/repositories/outfits-repository", () => ({ listOutfitsForTrip: vi.fn().mockResolvedValue([]), listOutfitItemsForTrip: vi.fn().mockResolvedValue([]) }));
vi.mock("../db/repositories/pre-trip-tasks-repository", () => ({ listPreTripTasksForTrip: vi.fn().mockResolvedValue([]) }));
vi.mock("../db/repositories/starter-pack-repository", () => ({ previewStarterPack: vi.fn(async () => ({ newSuggestionCount: mocks.suggestionCount })) }));
vi.mock("../db/repositories/gadget-bundles-repository", () => ({ findMissingDependencies: vi.fn().mockReturnValue([]) }));

import { DashboardScreen } from "../features/dashboard/DashboardScreen";

describe("DashboardScreen readiness", () => {
  beforeEach(() => {
    mocks.items = [packingItem("Passport", "essential", "needed", "bag:cabin")];
    mocks.suggestionCount = 0;
  });

  it("renders readiness and actionable traveller, bag and essential links", async () => {
    render(<MemoryRouter><DashboardScreen /></MemoryRouter>);
    expect(await screen.findByText("Essentials missing")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Essentials not packed/ })).toHaveAttribute("href", "/trips/trip:1/pack?priority=essential&outstanding=true");
    expect(screen.getByRole("link", { name: /Seb/ })).toHaveAttribute("href", "/trips/trip:1/pack?owner=traveller:seb&outstanding=true");
    expect(screen.getByRole("link", { name: /Cabin bag/ })).toHaveAttribute("href", "/trips/trip:1/pack?bag=bag:cabin&outstanding=true");
  });

  it("prompts for a Starter Pack when there are no packing items", async () => {
    mocks.items = [];
    render(<MemoryRouter><DashboardScreen /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Build your packing list" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Build Starter Pack" })).toHaveAttribute("href", "/trips/trip:1/starter-pack");
  });

  it("does not nag when applied suggestions have nothing new", async () => {
    render(<MemoryRouter><DashboardScreen /></MemoryRouter>);
    await screen.findByText("Essentials missing");
    expect(screen.queryByRole("heading", { name: "Trip suggestions are available" })).not.toBeInTheDocument();
  });
});

function packingItem(name: string, priority: PackingItem["priority"], status: PackingItem["status"], bagId?: string): PackingItem {
  return {
    id: `item:${name}`, tripId: "trip:1", name, ownershipScope: "traveller", ownerTravellerId: "traveller:seb", category: "documents",
    quantity: 1, priority, status, bagId, flags: [], dependencyItemIds: [], source: "manual", forgottenRisk: false,
    createdAt: "2026-06-18T00:00:00.000Z", updatedAt: "2026-06-18T00:00:00.000Z",
  };
}
