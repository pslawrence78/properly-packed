import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { DashboardMetric } from "../features/dashboard/DashboardScreen";

describe("DashboardMetric", () => {
  it("renders as a linked dashboard card", () => {
    render(
      <MemoryRouter>
        <DashboardMetric label="To buy" to="/trips/trip:1/pack?status=to-buy" value="3" />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: /to buy/i });
    expect(link).toHaveAttribute("href", "/trips/trip:1/pack?status=to-buy");
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
