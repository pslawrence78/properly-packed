import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Traveller } from "../db/types";
import { TripForm } from "../features/trips/TripForm";

const travellers: Traveller[] = [
  {
    id: "traveller:beck",
    name: "Beck",
    travellerType: "adult",
    defaultIncluded: true,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  },
  {
    id: "traveller:albert",
    name: "Albert",
    travellerType: "dog",
    defaultIncluded: false,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  },
];

describe("TripForm", () => {
  it("submits a valid create trip payload", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <TripForm
        travellers={travellers}
        submitLabel="Create trip"
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText("Trip name"), "Summer Cruise");
    await user.type(screen.getByLabelText("Start date"), "2026-07-01");
    await user.type(screen.getByLabelText("End date"), "2026-07-08");
    await user.click(screen.getByRole("button", { name: "Create trip" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Summer Cruise",
        nights: 7,
        travellerIds: ["traveller:beck"],
      }),
    );
  });
});
