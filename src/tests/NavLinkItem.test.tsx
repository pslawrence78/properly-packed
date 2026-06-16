import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { desktopNavigation } from "../app/routes";
import { NavLinkItem } from "../components/navigation/NavLinkItem";

describe("NavLinkItem", () => {
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
});
