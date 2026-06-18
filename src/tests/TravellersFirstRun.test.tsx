import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTraveller: vi.fn().mockResolvedValue({ id: "traveller:new" }),
}));

vi.mock("../db", () => ({
  ensureDatabaseReady: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../db/repositories/travellers-repository", () => ({
  createTraveller: mocks.createTraveller,
  listTravellers: vi.fn().mockResolvedValue([]),
  updateTraveller: vi.fn(),
}));

import { TravellersScreen } from "../features/travellers/TravellersScreen";

describe("traveller first-run return flow", () => {
  it("opens traveller creation and returns to Create Trip after save", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/travellers?add=1&returnTo=%2Ftrips%2Fnew"]}>
        <Routes>
          <Route path="/travellers" element={<TravellersScreen />} />
          <Route path="/trips/new" element={<h1>Returned to Create Trip</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("form", { name: "Add traveller" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Name"), "Taylor");
    await user.click(screen.getByRole("button", { name: "Save traveller" }));

    expect(mocks.createTraveller).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Taylor", travellerType: "adult" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Returned to Create Trip" }),
    ).toBeInTheDocument();
  });
});
