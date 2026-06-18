import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Traveller } from "../db/types";

const mocks = vi.hoisted(() => ({
  travellers: [] as Traveller[],
}));

vi.mock("../db", () => ({
  ensureDatabaseReady: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../db/repositories/app-settings-repository", () => ({
  getActiveTripId: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../db/repositories/trips-repository", () => ({
  createTrip: vi.fn(),
  getTrip: vi.fn().mockResolvedValue(undefined),
  listTrips: vi.fn().mockResolvedValue([]),
}));
vi.mock("../db/repositories/travellers-repository", () => ({
  listTravellers: vi.fn(async () => [...mocks.travellers]),
}));
vi.mock("../db/repositories/context-options-repository", () => ({
  listContextOptions: vi.fn().mockResolvedValue([]),
}));
vi.mock("../db/repositories/bags-repository", () => ({
  createDefaultBagsForTrip: vi.fn(),
  listBagsForTrip: vi.fn().mockResolvedValue([]),
}));

import { DashboardScreen } from "../features/dashboard/DashboardScreen";
import { CreateTripScreen } from "../features/trips/CreateTripScreen";

describe("first-run flow", () => {
  beforeEach(() => {
    mocks.travellers = [];
  });

  it("guides a fresh install to add travellers without family-specific data", async () => {
    const { container } = render(
      <MemoryRouter><DashboardScreen /></MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "Start by adding your travellers" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add traveller" })).toHaveAttribute(
      "href",
      "/travellers?add=1",
    );
    expect(screen.getByRole("link", { name: "Manage trip contexts" })).toBeInTheDocument();
    for (const name of ["Phil", "Beck", "Seb", "Albert", "Shared Family"]) {
      expect(container).not.toHaveTextContent(name);
    }
  });

  it("blocks the normal Create Trip form when there are no travellers", async () => {
    render(<MemoryRouter><CreateTripScreen /></MemoryRouter>);

    expect(
      await screen.findByRole("heading", { name: "Add a traveller before creating a trip" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Trip name")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add traveller" })).toHaveAttribute(
      "href",
      "/travellers?add=1&returnTo=%2Ftrips%2Fnew",
    );
    expect(screen.getByRole("link", { name: "Back to trips" })).toBeInTheDocument();
  });

  it("shows the trip form once a user-created traveller exists", async () => {
    mocks.travellers = [traveller("traveller:user", "Taylor")];
    render(<MemoryRouter><CreateTripScreen /></MemoryRouter>);

    expect(await screen.findByLabelText("Trip name")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Taylor/i })).toBeChecked();
    expect(screen.getByRole("heading", { name: "Trip contexts" })).toBeInTheDocument();
  });
});

function traveller(id: string, name: string): Traveller {
  return {
    id,
    name,
    travellerType: "adult",
    defaultIncluded: true,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
  };
}
