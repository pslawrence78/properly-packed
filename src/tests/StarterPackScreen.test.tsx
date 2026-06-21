import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  applyStarterPack: vi.fn().mockResolvedValue({
    itemsAdded: 4,
    duplicatesSkipped: 1,
    tasksCreated: 0,
    summary: "4 items added. 1 duplicate skipped.",
  }),
  getTrip: vi.fn(),
  listTravellers: vi.fn(),
  previewStarterPack: vi.fn(),
}));

vi.mock("../db", () => ({ ensureDatabaseReady: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../db/repositories/trips-repository", () => ({
  getTrip: mocks.getTrip,
}));
vi.mock("../db/repositories/travellers-repository", () => ({
  listTravellers: mocks.listTravellers,
}));
vi.mock("../db/repositories/starter-pack-repository", () => ({
  applyStarterPack: mocks.applyStarterPack,
  previewStarterPack: mocks.previewStarterPack,
}));

import { StarterPackScreen } from "../features/starter-pack";

describe("StarterPackScreen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders grouped suggestions, supports selection and applies only selected sources", async () => {
    mocks.getTrip.mockResolvedValue(trip);
    mocks.listTravellers.mockResolvedValue([adult]);
    mocks.previewStarterPack.mockResolvedValue(preview);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/trips/trip:1/starter-pack"]}>
        <Routes>
          <Route path="/trips/:tripId/starter-pack" element={<StarterPackScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Suggestions for Test trip" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Matching templates" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Useful extras" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Gadget bundles" })).toBeInTheDocument();
    expect(screen.getByText("Already packed item")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/trips/trip:1");
    expect(mocks.applyStarterPack).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox", { name: /Cooling towel/ }));
    await user.click(screen.getByRole("button", { name: "Apply selected" }));

    expect(mocks.applyStarterPack).toHaveBeenCalledWith(
      expect.objectContaining({
        templateIds: ["template:theme"],
        usefulExtraIds: [],
        gadgetBundles: [expect.objectContaining({ bundleId: "bundle:battery" })],
      }),
    );
    expect(await screen.findByText("4 items added. 1 duplicate skipped.")).toBeInTheDocument();
  });

  it("shows a useful not-found state for an unknown trip", async () => {
    mocks.getTrip.mockResolvedValue(undefined);
    mocks.listTravellers.mockResolvedValue([]);
    renderStarterPack();

    expect(await screen.findByRole("heading", { name: "Trip not found" })).toBeInTheDocument();
    expect(mocks.previewStarterPack).not.toHaveBeenCalled();
  });

  it("does not generate suggestions for an archived trip", async () => {
    mocks.getTrip.mockResolvedValue({ ...trip, archivedAt: "2026-06-20" });
    mocks.listTravellers.mockResolvedValue([adult]);
    renderStarterPack();

    expect(await screen.findByRole("heading", { name: "Trip not found" })).toBeInTheDocument();
    expect(mocks.previewStarterPack).not.toHaveBeenCalled();
  });

  it("gracefully previews a trip with no travellers", async () => {
    mocks.getTrip.mockResolvedValue({ ...trip, travellerIds: [] });
    mocks.listTravellers.mockResolvedValue([]);
    mocks.previewStarterPack.mockResolvedValue({
      ...preview,
      trip: { ...trip, travellerIds: [] },
      travellers: [],
      gadgetBundles: preview.gadgetBundles.map((bundle) => ({
        ...bundle,
        ownerTraveller: undefined,
      })),
    });
    renderStarterPack();

    expect(await screen.findByText(/This trip has no travellers yet/)).toBeInTheDocument();
    expect(screen.getByText(/Add or choose a traveller before this bundle/)).toBeInTheDocument();
  });
});

function renderStarterPack() {
  return render(
    <MemoryRouter initialEntries={["/trips/trip:1/starter-pack"]}>
      <Routes>
        <Route path="/trips/:tripId/starter-pack" element={<StarterPackScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

const adult = {
  id: "traveller:adult",
  name: "Adult",
  travellerType: "adult" as const,
  defaultIncluded: true,
  createdAt: "2026-06-20",
  updatedAt: "2026-06-20",
};

const trip = {
  id: "trip:1",
  name: "Test trip",
  tripType: "theme-park" as const,
  startDate: "2026-08-01",
  endDate: "2026-08-02",
  nights: 1,
  destinations: [],
  climateContextIds: [],
  accommodationContextIds: [],
  transportContextIds: [],
  activityContextIds: [],
  travellerIds: [adult.id],
  status: "planning" as const,
  createdAt: "2026-06-20",
  updatedAt: "2026-06-20",
};

const template = {
  id: "template:theme",
  name: "Theme park",
  applicableTripTypes: ["theme-park" as const],
  applicableTravellers: ["adult" as const],
  applicableContexts: [],
  active: true,
  createdAt: "2026-06-20",
  updatedAt: "2026-06-20",
};

const preview = {
  trip,
  travellers: [adult],
  templates: [{ template, suggestions: [], newCount: 3, duplicateCount: 0, skippedCount: 0, reason: "Suggested by Theme park template." }],
  usefulExtras: [{
    extra: {
      id: "extra:cooling",
      name: "Cooling towel",
      category: "comfort",
      applicableTripTypes: ["theme-park" as const],
      applicableContexts: [],
      defaultPriority: "useful" as const,
      alwaysSuggest: false,
      neverSuggest: false,
      forgottenBefore: false,
      invaluableBefore: false,
      createdAt: "2026-06-20",
      updatedAt: "2026-06-20",
    },
    status: "new" as const,
    reason: "Useful extra for theme park.",
  }],
  gadgetBundles: [{
    bundle: {
      id: "bundle:battery",
      name: "Battery kit",
      applicableTripTypes: ["theme-park" as const],
      applicableContexts: [],
      createdAt: "2026-06-20",
      updatedAt: "2026-06-20",
    },
    ownerTraveller: adult,
    suggestions: [{
      bundleItem: {
        id: "bundle-item:power",
        bundleId: "bundle:battery",
        name: "Power bank",
        category: "electronics",
        required: true,
        quantity: 1,
        flags: ["battery"],
        createdAt: "2026-06-20",
        updatedAt: "2026-06-20",
      },
      status: "new" as const,
      optional: false,
    }],
    requiredCount: 1,
    optionalCount: 0,
    duplicateCount: 0,
    reason: "Suggested by Battery kit.",
  }],
  reviewLearnings: [],
  alreadyIncluded: [{
    id: "packing:existing",
    tripId: trip.id,
    name: "Already packed item",
    ownershipScope: "shared" as const,
    category: "misc",
    quantity: 1,
    priority: "useful" as const,
    status: "needed" as const,
    flags: [],
    dependencyItemIds: [],
    source: "manual" as const,
    forgottenRisk: false,
    createdAt: "2026-06-20",
    updatedAt: "2026-06-20",
  }],
  newSuggestionCount: 5,
  duplicateCount: 1,
};
