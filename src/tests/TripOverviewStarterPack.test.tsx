import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ ensureDatabaseReady: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../db/repositories/app-settings-repository", () => ({
  getActiveTripId: vi.fn().mockResolvedValue(undefined),
  setActiveTripId: vi.fn(),
}));
vi.mock("../db/repositories/context-options-repository", () => ({
  listContextOptions: vi.fn().mockResolvedValue([]),
}));
vi.mock("../db/repositories/travellers-repository", () => ({
  listTravellers: vi.fn().mockResolvedValue([]),
}));
vi.mock("../db/repositories/trips-repository", () => ({
  duplicateTripShell: vi.fn(),
  getTrip: vi.fn().mockResolvedValue({
    id: "trip:1",
    name: "Simple trip",
    tripType: "short-break",
    startDate: "2026-08-01",
    endDate: "2026-08-02",
    nights: 1,
    destinations: [],
    climateContextIds: [],
    accommodationContextIds: [],
    transportContextIds: [],
    activityContextIds: [],
    travellerIds: [],
    status: "planning",
  }),
  updateTrip: vi.fn(),
}));

import { TripOverviewScreen } from "../features/trips/TripOverviewScreen";

describe("Trip overview starter pack entry point", () => {
  it("offers starter pack generation for a simple existing trip", async () => {
    render(
      <MemoryRouter initialEntries={["/trips/trip:1"]}>
        <Routes>
          <Route path="/trips/:tripId" element={<TripOverviewScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("link", { name: "Build starter pack" })).toHaveAttribute(
      "href",
      "/trips/trip:1/starter-pack",
    );
  });
});
