import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { TemplatePreview } from "../db/repositories/templates-repository";

const mocks = vi.hoisted(() => ({
  applyTemplateToTrip: vi.fn().mockResolvedValue({
    inserted: 1,
    skippedDuplicates: 2,
    skippedUnmatched: 1,
  }),
}));

vi.mock("../db", () => ({ ensureDatabaseReady: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../db/repositories/trips-repository", () => ({
  getTrip: vi.fn().mockResolvedValue({
    id: "trip:1",
    name: "Test trip",
    tripType: "city-break",
    travellerIds: ["traveller:adult"],
  }),
}));
vi.mock("../db/repositories/travellers-repository", () => ({
  listTravellers: vi.fn().mockResolvedValue([
    {
      id: "traveller:adult",
      name: "Adult traveller",
      travellerType: "adult",
      defaultIncluded: true,
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:00.000Z",
    },
  ]),
}));
vi.mock("../db/repositories/templates-repository", () => ({
  applyTemplateToTrip: mocks.applyTemplateToTrip,
  previewTemplatesForTrip: vi.fn().mockResolvedValue([previewRow()]),
}));
vi.mock("../db/repositories/useful-extras-repository", () => ({
  addUsefulExtraToTrip: vi.fn(),
  listUsefulExtraSuggestionsForTrip: vi.fn().mockResolvedValue([]),
}));

import { TripTemplatesScreen } from "../features/templates/TripTemplatesScreen";

describe("TripTemplatesScreen", () => {
  it("shows an apply result summary and packing-list action", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <MemoryRouter initialEntries={["/trips/trip:1/templates"]}>
        <Routes>
          <Route path="/trips/:tripId/templates" element={<TripTemplatesScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: "Apply 1 new item" }));
    expect(await screen.findByText("Travel template template applied")).toBeInTheDocument();
    expect(screen.getByText(/1 added, 2 skipped as duplicates, and 1 unresolved/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open packing list" })).toHaveAttribute(
      "href",
      "/trips/trip:1/pack",
    );
  });
});

function previewRow(): TemplatePreview {
  const template: TemplatePreview["template"] = {
    id: "template:test",
    name: "Travel template",
    applicableTripTypes: ["city-break"],
    applicableTravellers: ["adult"],
    applicableContexts: [],
    active: true,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
  };
  return {
    template,
    suggestions: [
      {
        key: "item:documents:shared:none",
        template,
        templateItem: {
          id: "item:documents",
          templateId: template.id,
          name: "Travel documents",
          ownerType: "shared",
          category: "documents",
          quantity: 1,
          priority: "essential",
          flags: [],
          conditionRules: [],
          createdAt: "2026-06-18T00:00:00.000Z",
          updatedAt: "2026-06-18T00:00:00.000Z",
        },
        ownershipScope: "shared",
        packingStatus: "needed",
        status: "new",
        reason: "Suggested by Travel template. Suggested as a shared trip item.",
      },
    ],
    newCount: 1,
    duplicateCount: 0,
    skippedCount: 0,
  };
}
