import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { OutfitInput } from "../db/repositories/outfits-repository";
import type { Outfit, Traveller } from "../db/types";
import { OutfitForm } from "../features/outfits/OutfitForm";

const travellers: Traveller[] = [
  traveller("traveller:beck", "Beck"),
  traveller("traveller:phil", "Phil"),
];

describe("OutfitForm", () => {
  it("submits a new outfit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    render(
      <OutfitForm
        submitLabel="Create outfit"
        travellers={travellers}
        tripId="trip:1"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText("Outfit name"), "Day one dress");
    await user.type(screen.getByLabelText("Trip day"), "1");
    await user.click(screen.getByLabelText("Rewear eligible"));
    await user.click(screen.getByRole("button", { name: "Create outfit" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining<Partial<OutfitInput>>({
        tripId: "trip:1",
        name: "Day one dress",
        ownerTravellerId: "traveller:beck",
        outfitType: "day",
        plannedForDay: 1,
        status: "planned",
        rewearEligible: true,
      }),
    );
  });

  it("submits edits to an existing outfit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    render(
      <OutfitForm
        initialOutfit={outfit()}
        submitLabel="Save outfit"
        travellers={travellers}
        tripId="trip:1"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.clear(screen.getByLabelText("Outfit name"));
    await user.type(screen.getByLabelText("Outfit name"), "Dinner outfit");
    await user.selectOptions(screen.getByLabelText("Status"), "packed");
    await user.click(screen.getByRole("button", { name: "Save outfit" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining<Partial<OutfitInput>>({
        name: "Dinner outfit",
        status: "packed",
        outfitType: "evening",
        plannedForDay: 2,
      }),
    );
  });
});

function traveller(id: string, name: string): Traveller {
  return {
    id,
    name,
    travellerType: "adult",
    defaultIncluded: true,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

function outfit(): Outfit {
  return {
    id: "outfit:1",
    tripId: "trip:1",
    ownerTravellerId: "traveller:beck",
    name: "Evening outfit",
    outfitType: "evening",
    plannedForDay: 2,
    status: "still-deciding",
    rewearEligible: false,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}
