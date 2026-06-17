import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PackingItem, Traveller } from "../db/types";
import { PackingItemForm } from "../features/packing-items/PackingItemForm";

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

describe("PackingItemForm", () => {
  it("submits a new packing item", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <PackingItemForm
        bags={[]}
        categories={["documents", "electronics"]}
        travellers={travellers}
        tripId="trip:1"
        submitLabel="Add item"
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText("Item name"), "Passport");
    await user.click(screen.getByRole("button", { name: "Add item" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        tripId: "trip:1",
        name: "Passport",
        ownershipScope: "unassigned",
        ownerTravellerId: undefined,
        category: "documents",
        quantity: 1,
        priority: "important",
        status: "needed",
      }),
    );
  });

  it("submits edits to an existing packing item", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const initialItem: PackingItem = {
      id: "item:1",
      tripId: "trip:1",
      name: "Old cable",
      ownershipScope: "traveller",
      ownerTravellerId: "traveller:alex",
      category: "electronics",
      quantity: 1,
      priority: "useful",
      status: "needed",
      flags: [],
      dependencyItemIds: [],
      source: "manual",
      forgottenRisk: false,
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    };

    render(
      <PackingItemForm
        bags={[]}
        categories={["documents", "electronics"]}
        initialItem={initialItem}
        travellers={travellers}
        tripId="trip:1"
        submitLabel="Save item"
        onSubmit={onSubmit}
      />,
    );

    await user.clear(screen.getByLabelText("Item name"));
    await user.type(screen.getByLabelText("Item name"), "USB-C cable");
    await user.click(screen.getByRole("button", { name: "Save item" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "USB-C cable",
        ownershipScope: "traveller",
        ownerTravellerId: "traveller:alex",
        category: "electronics",
      }),
    );
  });

  it("submits shared items without an owner traveller", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <PackingItemForm
        bags={[]}
        categories={["documents"]}
        travellers={travellers}
        tripId="trip:1"
        submitLabel="Add item"
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText("Item name"), "Travel insurance");
    await user.selectOptions(screen.getByLabelText("Ownership"), "shared");
    await user.click(screen.getByRole("button", { name: "Add item" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Travel insurance",
        ownershipScope: "shared",
        ownerTravellerId: undefined,
      }),
    );
  });
});
