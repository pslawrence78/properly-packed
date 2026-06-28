import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../app/App";
import { APP_RELEASE_LABEL, APP_TAGLINE, APP_VERSION } from "../lib/app-version";

describe("Properly Packed app shell", () => {
  it("renders the app name and tagline", () => {
    render(<App />);

    expect(
      screen.getAllByText("Properly Packed", { selector: "p" })[0],
    ).toBeInTheDocument();
    expect(screen.getByText(APP_TAGLINE)).toBeInTheDocument();
  });

  it("renders the main navigation", () => {
    render(<App />);

    expect(screen.getAllByLabelText("Primary navigation").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Trips" }).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", {
        name: /Pack\. Create or select an active trip first/i,
      }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Library" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "More" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("renders the trips route", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("link", { name: "Trips" })[0]);

    expect(
      await screen.findByRole(
        "heading",
        { level: 1, name: "Trips" },
        { timeout: 3_000 },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Create, edit and reuse travel plans."),
    ).toBeInTheDocument();
  });

  it("shows the version on the settings screen", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("link", { name: "Settings" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Settings" }),
    ).toBeInTheDocument();
    expect(APP_VERSION).toBe("0.30.0");
    expect(screen.getAllByText(`v${APP_VERSION}`).length).toBeGreaterThan(0);
    expect(screen.getByText(APP_RELEASE_LABEL)).toBeInTheDocument();
    expect(screen.getByText("Export schema")).toBeInTheDocument();
    expect(screen.getAllByText("v2").length).toBeGreaterThan(0);
  });

  it("opens the mobile administration hub without an active trip", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("link", { name: "More" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Settings" }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /Backup & Restore/ })
        .every((link) => link.getAttribute("href") === "/settings/import-export"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /Travellers/ })
        .some((link) => link.getAttribute("href") === "/travellers"),
    ).toBe(true);
    expect(screen.getByRole("link", { name: /Trip Contexts/ })).toHaveAttribute(
      "href",
      "/settings/contexts",
    );
    expect(screen.getByRole("link", { name: /Templates/ })).toHaveAttribute(
      "href",
      "/library/templates",
    );
    expect(screen.getByRole("link", { name: /Useful Extras/ })).toHaveAttribute(
      "href",
      "/library/useful-extras",
    );
    expect(screen.getByRole("link", { name: /Gadget Bundles/ })).toHaveAttribute(
      "href",
      "/library/gadgets",
    );
  });
});
