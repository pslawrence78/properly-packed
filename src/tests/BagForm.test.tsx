import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Traveller } from "../db/types";
import { BagForm } from "../features/bags/BagForm";

const travellers: Traveller[] = [
  {
    id: "traveller:beck",
    name: "Beck",
    travellerType: "adult",
    defaultIncluded: true,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  },
];

describe("BagForm", () => {
  it("submits a new bag", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <BagForm
        travellers={travellers}
        tripId="trip:1"
        submitLabel="Create bag"
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText("Bag name"), "Pool bag");
    await user.selectOptions(screen.getByLabelText("Bag type"), "day-bag");
    await user.click(screen.getByLabelText("Travel day"));
    await user.click(screen.getByRole("button", { name: "Create bag" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        tripId: "trip:1",
        name: "Pool bag",
        bagType: "day-bag",
        isTravelDay: true,
      }),
    );
  });
});
