import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Traveller, Trip } from "../db/types";
import { TripCard } from "../features/trips/TripsScreen";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TripCard safe actions", () => {
  it("explains shell-only duplication and requires confirmation", async () => {
    const user = userEvent.setup();
    const onDuplicate = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderCard({ onDuplicate });

    expect(
      screen.getByText(/Packing items, bags, outfits, itinerary, gadgets and applied templates are not copied/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Duplicate trip details" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/trip details only/i));
    expect(onDuplicate).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Duplicate trip details" }));
    expect(onDuplicate).toHaveBeenCalledOnce();
  });

  it("keeps a draft when archive is cancelled and archives after confirmation", async () => {
    const user = userEvent.setup();
    const onArchive = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderCard({ onArchive });

    await user.click(screen.getByRole("button", { name: "Archive draft" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/saved data will remain/i));
    expect(onArchive).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Archive draft" }));
    expect(onArchive).toHaveBeenCalledOnce();
  });
});

function renderCard({
  onArchive = vi.fn(),
  onDuplicate = vi.fn(),
}: {
  onArchive?: () => void;
  onDuplicate?: () => void;
}) {
  return render(
    <MemoryRouter>
      <TripCard
        active={false}
        onArchive={onArchive}
        onDuplicate={onDuplicate}
        onSetActive={vi.fn()}
        travellers={[traveller()]}
        trip={trip()}
      />
    </MemoryRouter>,
  );
}

function traveller(): Traveller {
  return {
    id: "traveller:adult",
    name: "Adult traveller",
    travellerType: "adult",
    defaultIncluded: true,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

function trip(): Trip {
  return {
    id: "trip:city-break",
    name: "City break",
    tripType: "city-break",
    startDate: "2026-08-01",
    endDate: "2026-08-04",
    nights: 3,
    destinations: ["York"],
    climateContextIds: [],
    accommodationContextIds: [],
    transportContextIds: [],
    activityContextIds: [],
    accommodationTypes: ["hotel"],
    transportModes: ["train"],
    activityContexts: [],
    travellerIds: ["traveller:adult"],
    status: "draft",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}
