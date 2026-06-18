import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { desktopNavigation } from "../app/routes";
import { NavLinkItem } from "../components/navigation/NavLinkItem";
import { ACTIVE_TRIP_CHANGED_EVENT } from "../db/repositories/app-settings-repository";

const mocks = vi.hoisted(() => ({
  activeTrip: undefined as { id: string } | undefined,
}));

vi.mock("../db", () => ({ ensureDatabaseReady: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../db/repositories/trips-repository", () => ({
  getActiveTrip: vi.fn(async () => mocks.activeTrip),
}));

describe("NavLinkItem", () => {
  beforeEach(() => {
    mocks.activeTrip = undefined;
  });

  it("keeps active desktop items visible while hovered", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <NavLinkItem item={desktopNavigation[0]} variant="desktop" />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Dashboard" });

    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveClass("bg-teal");
    expect(link).toHaveClass("text-white");
    expect(link).toHaveClass("hover:bg-tealDeep");
    expect(link).not.toHaveClass("hover:bg-white/80");
  });

  it("uses separate inactive desktop hover styling", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <NavLinkItem item={desktopNavigation[1]} variant="desktop" />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Trips" });

    expect(link).not.toHaveAttribute("aria-current");
    expect(link).toHaveClass("text-charcoalSoft");
    expect(link).toHaveClass("hover:bg-tealSoft");
    expect(link).toHaveClass("hover:text-tealDeep");
    expect(link).not.toHaveClass("bg-teal");
  });

  it("renders trip-dependent navigation as non-navigable without an active trip", async () => {
    const packItem = desktopNavigation.find((item) => item.label === "Pack");
    if (!packItem) throw new Error("Pack navigation item is missing.");

    render(
      <MemoryRouter>
        <NavLinkItem item={packItem} variant="desktop" />
      </MemoryRouter>,
    );

    const disabledItem = await screen.findByRole("link", {
      name: /Pack\. Create or select an active trip first/i,
    });
    expect(disabledItem).toHaveAttribute("aria-disabled", "true");
    expect(disabledItem).not.toHaveAttribute("href");
    expect(document.body.innerHTML).not.toContain("/trips/demo");
  });

  it("targets the real active trip once one exists", async () => {
    mocks.activeTrip = { id: "trip:coastal-break" };
    const bagsItem = desktopNavigation.find((item) => item.label === "Bags");
    if (!bagsItem) throw new Error("Bags navigation item is missing.");

    render(
      <MemoryRouter>
        <NavLinkItem item={bagsItem} variant="desktop" />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("link", { name: "Bags" })).toHaveAttribute(
      "href",
      "/trips/trip:coastal-break/bags",
    );
  });

  it("unlocks trip navigation when the active trip changes in place", async () => {
    const packItem = desktopNavigation.find((item) => item.label === "Pack");
    if (!packItem) throw new Error("Pack navigation item is missing.");

    render(
      <MemoryRouter>
        <NavLinkItem item={packItem} variant="desktop" />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("link", { name: /Pack\. Create or select/i }),
    ).toHaveAttribute("aria-disabled", "true");

    mocks.activeTrip = { id: "trip:newly-active" };
    window.dispatchEvent(new Event(ACTIVE_TRIP_CHANGED_EVENT));

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Pack" })).toHaveAttribute(
        "href",
        "/trips/trip:newly-active/pack",
      ),
    );
  });
});
