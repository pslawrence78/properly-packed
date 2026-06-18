import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Traveller } from "../db/types";
import { QuickAddPackingItem } from "../features/packing-items/QuickAddPackingItem";

const travellers: Traveller[] = [
  {
    id: "traveller:alex",
    name: "Alex",
    travellerType: "adult",
    defaultIncluded: true,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  },
];

describe("QuickAddPackingItem", () => {
  it.each([
    ["unassigned", undefined],
    ["shared", undefined],
    ["traveller", "traveller:alex"],
  ] as const)("quick adds with %s ownership", async (ownershipScope, ownerTravellerId) => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <QuickAddPackingItem
        defaultOwnership={{ ownershipScope, ownerTravellerId }}
        onSubmit={onSubmit}
        travellers={travellers}
        tripId="trip:1"
      />,
    );

    await user.type(screen.getByLabelText("Item name"), "Passport");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onSubmit).toHaveBeenCalledWith({
      tripId: "trip:1",
      name: "Passport",
      ownershipScope,
      ownerTravellerId,
      category: "misc",
      quantity: 1,
      priority: "important",
      status: "needed",
    });
    expect(screen.getByLabelText("Item name")).toHaveValue("");
  });
});
