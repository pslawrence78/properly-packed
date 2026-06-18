import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PackingItem, Trip } from "../db/types";
import { ReviewItemRow } from "../features/reviews/PostTripReviewScreen";

describe("ReviewItemRow", () => {
  it("captures a forgotten item tag", async () => {
    const user = userEvent.setup();
    const onCapture = vi.fn();

    render(<ReviewItemRow item={item()} trip={trip()} onCapture={onCapture} />);

    await user.click(screen.getByRole("button", { name: "Forgotten" }));

    expect(onCapture).toHaveBeenCalledWith("forgotten");
  });
});

function item(): PackingItem {
  return {
    id: "item:1",
    tripId: "trip:1",
    name: "Beach shoes",
    ownershipScope: "traveller",
    ownerTravellerId: "traveller:beck",
    category: "clothing",
    quantity: 1,
    priority: "important",
    status: "unused",
    flags: [],
    dependencyItemIds: [],
    source: "manual",
    forgottenRisk: false,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

function trip(): Trip {
  return {
    id: "trip:1",
    name: "Review trip",
    tripType: "cruise",
    startDate: "2026-08-01",
    endDate: "2026-08-08",
    nights: 7,
    destinations: ["Southampton"],
    climateContextIds: [],
    accommodationContextIds: [],
    transportContextIds: [],
    activityContextIds: [],
    accommodationTypes: ["ship"],
    transportModes: ["ship"],
    activityContexts: ["cruise"],
    travellerIds: ["traveller:beck"],
    status: "completed",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}
