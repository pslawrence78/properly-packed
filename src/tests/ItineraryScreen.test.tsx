import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextOption, Trip, TripItineraryDay } from "../db/types";

const mocks = vi.hoisted(() => ({
  trip: undefined as Trip | undefined,
  days: [] as TripItineraryDay[],
  contextOptions: [] as ContextOption[],
  saveItineraryDays: vi.fn(),
}));

vi.mock("../db", () => ({ ensureDatabaseReady: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../db/repositories/trips-repository", () => ({
  getTrip: vi.fn(async () => mocks.trip),
}));
vi.mock("../db/repositories/context-options-repository", () => ({
  listContextOptions: vi.fn(async () => mocks.contextOptions),
}));
vi.mock("../db/repositories/trip-itinerary-repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../db/repositories/trip-itinerary-repository")>()),
  listItineraryDaysForTrip: vi.fn(async () => mocks.days),
  saveItineraryDays: mocks.saveItineraryDays,
}));

import { ItineraryScreen } from "../features/itinerary/ItineraryScreen";

describe("ItineraryScreen context wiring", () => {
  beforeEach(() => {
    mocks.trip = trip();
    mocks.days = [day()];
    mocks.contextOptions = [
      context("climate:warm", "climate", "Warm"),
      context("accommodation:hotel", "accommodation", "Hotel"),
      context("transport:train", "transport", "Train"),
      context("activity:museum", "activity", "Museum day", false),
    ];
    mocks.saveItineraryDays.mockReset();
    mocks.saveItineraryDays.mockImplementation(async () => mocks.days);
  });

  it("resolves all ID-based trip contexts, including inactive and unknown options", async () => {
    mocks.trip = trip({ activityContextIds: ["activity:museum", "activity:missing"] });
    renderScreen();

    expect(await screen.findByRole("heading", { name: "City break" })).toBeInTheDocument();
    for (const label of ["Paris, France", "Warm", "Hotel", "Train", "Museum day", "Unknown context"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText("Add climate on the trip first.")).not.toBeInTheDocument();
    expect(screen.queryByText("Add accommodation on the trip first.")).not.toBeInTheDocument();
    expect(screen.queryByText("Add transport on the trip first.")).not.toBeInTheDocument();
    expect(screen.queryByText("Add activities on the trip first.")).not.toBeInTheDocument();
  });

  it("shows guidance only for genuinely empty trip context ID arrays", async () => {
    mocks.trip = trip({
      climateContextIds: [],
      accommodationContextIds: [],
      transportContextIds: [],
      activityContextIds: [],
    });
    renderScreen();

    expect((await screen.findAllByText("Add climate on the trip first.")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Add accommodation on the trip first.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Add transport on the trip first.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Add activities on the trip first.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Paris, France").length).toBeGreaterThan(0);
  });

  it("preserves existing itinerary saving", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(await screen.findByRole("button", { name: "Save itinerary" }));
    expect(mocks.saveItineraryDays).toHaveBeenCalledWith(
      expect.objectContaining({ id: "trip:1" }),
      expect.arrayContaining([expect.objectContaining({ dayNumber: 1 })]),
    );
    expect(await screen.findByText("Itinerary saved.")).toBeInTheDocument();
  });
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={["/trips/trip:1/itinerary"]}>
      <Routes>
        <Route path="/trips/:tripId/itinerary" element={<ItineraryScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip:1",
    name: "City break",
    tripType: "city-break",
    startDate: "2026-09-01",
    endDate: "2026-09-01",
    nights: 0,
    destinations: ["Paris, France"],
    climateContextIds: ["climate:warm"],
    accommodationContextIds: ["accommodation:hotel"],
    transportContextIds: ["transport:train"],
    activityContextIds: ["activity:museum"],
    travellerIds: ["traveller:user"],
    status: "planning",
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
    ...overrides,
  };
}

function day(): TripItineraryDay {
  return {
    id: "itinerary-day:trip:1:1",
    tripId: "trip:1",
    dayNumber: 1,
    date: "2026-09-01",
    destinationContexts: [],
    climateContexts: [],
    accommodationContexts: [],
    transportContexts: [],
    activityContexts: [],
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
  };
}

function context(
  id: string,
  type: ContextOption["type"],
  label: string,
  active = true,
): ContextOption {
  return {
    id,
    type,
    label,
    active,
    sortOrder: 0,
    archivedAt: active ? undefined : "2026-06-18T00:00:00.000Z",
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
  };
}
