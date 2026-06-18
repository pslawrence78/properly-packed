import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextOption } from "../db/types";

const mocks = vi.hoisted(() => ({
  options: [] as ContextOption[],
  create: vi.fn(),
  update: vi.fn(),
  deactivate: vi.fn(),
  reactivate: vi.fn(),
}));

vi.mock("../db", () => ({ ensureDatabaseReady: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../db/repositories/context-options-repository", () => ({
  listContextOptions: vi.fn(async () => [...mocks.options]),
  createContextOption: mocks.create,
  updateContextOption: mocks.update,
  deactivateContextOption: mocks.deactivate,
  reactivateContextOption: mocks.reactivate,
}));

import { ContextsSettingsScreen } from "../features/settings/ContextsSettingsScreen";

describe("ContextsSettingsScreen", () => {
  beforeEach(() => {
    mocks.options.splice(0, mocks.options.length, option("activity:pool", "activity", "Pool"));
    mocks.create.mockReset().mockImplementation(async ({ type, label }) => {
      const created = option(`created:${label}`, type, label);
      mocks.options.push(created);
      return created;
    });
    mocks.update.mockReset();
    mocks.deactivate.mockReset();
    mocks.reactivate.mockReset();
  });

  it("renders four groups and creates a reusable context option", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ContextsSettingsScreen /></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "Climate Profiles" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Accommodation Types" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Transport Modes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Activity Contexts" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("New activity label"), "Museum day");
    await user.click(screen.getByLabelText("New activity label").closest("form")!.querySelector("button")!);

    expect(mocks.create).toHaveBeenCalledWith({
      type: "activity",
      label: "Museum day",
      description: "",
    });
    expect(await screen.findByText("Museum day")).toBeInTheDocument();
  });
});

function option(id: string, type: ContextOption["type"], label: string): ContextOption {
  return {
    id,
    type,
    label,
    active: true,
    sortOrder: 0,
    createdAt: "2026-06-17T00:00:00.000Z",
    updatedAt: "2026-06-17T00:00:00.000Z",
  };
}
