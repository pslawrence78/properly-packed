import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../app/App";
import { APP_TAGLINE, APP_VERSION } from "../lib/app-version";

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
    expect(screen.getAllByRole("link", { name: "Pack" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Library" }).length).toBeGreaterThan(0);
  });

  it("renders the trips route", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("link", { name: "Trips" })[0]);

    expect(
      screen.getByRole("heading", { level: 1, name: "Trips" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Create, edit and reuse family travel plans."),
    ).toBeInTheDocument();
  });

  it("shows the version on the settings screen", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("link", { name: "Settings" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Settings" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(`v${APP_VERSION}`).length).toBeGreaterThan(0);
  });
});
