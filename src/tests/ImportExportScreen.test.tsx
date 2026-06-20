import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { exportTableNames } from "../features/import-export/export-schema";

const mocks = vi.hoisted(() => ({
  replaceDataFromExport: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db")>();
  return {
    ...actual,
    ensureDatabaseReady: vi.fn().mockResolvedValue(undefined),
    resetDatabaseReadyCache: vi.fn(),
  };
});
vi.mock("../features/import-export/import-export-service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../features/import-export/import-export-service")
  >();
  return {
    ...actual,
    getDataSafetySummary: vi.fn().mockResolvedValue({
      travellers: 2,
      trips: 1,
      packingItems: 4,
      bags: 2,
      templates: 9,
      contextOptions: 51,
      lastExportedAt: "2026-06-18T12:00:00.000Z",
    }),
    replaceDataFromExport: mocks.replaceDataFromExport,
    resetLocalData: vi.fn().mockResolvedValue(undefined),
  };
});

import { ImportExportScreen } from "../features/import-export/ImportExportScreen";

describe("ImportExportScreen", () => {
  it("shows backup confidence, privacy guidance and deliberate replace confirmation", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ImportExportScreen />
      </MemoryRouter>,
    );

    expect(screen.getByText("v0.25.0")).toBeInTheDocument();
    expect(screen.getByText("Database version")).toBeInTheDocument();
    expect(screen.getByText("v4")).toBeInTheDocument();
    expect(screen.getByText("Export schema")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByText(/may contain private trip, traveller and packing information/i)).toBeInTheDocument();
    expect(await screen.findByText(/Last successful export:/)).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Paste JSON" }), {
      target: { value: JSON.stringify(validExport()) },
    });
    await user.click(screen.getByRole("button", { name: "Preview pasted JSON" }));

    expect(await screen.findByRole("heading", { name: "Import preview" })).toBeInTheDocument();
    expect(screen.getAllByText(/properly-packed-export-v2/).length).toBeGreaterThan(0);
    expect(screen.getByText(/App version 0.23.0/)).toBeInTheDocument();
    expect(screen.getByText(/Supported current v2 backup/)).toBeInTheDocument();
    expect(mocks.replaceDataFromExport).not.toHaveBeenCalled();

    const replaceButton = screen.getByRole("button", { name: "Replace local data" });
    const confirmation = screen.getByRole("textbox", { name: /REPLACE MY DATA/ });
    expect(replaceButton).toBeDisabled();
    await user.type(confirmation, "replace my data");
    expect(replaceButton).toBeDisabled();
    await user.clear(confirmation);
    await user.type(confirmation, "REPLACE MY DATA");
    expect(replaceButton).toBeEnabled();
    await user.click(replaceButton);
    expect(mocks.replaceDataFromExport).toHaveBeenCalledOnce();
  });
});

function validExport() {
  return {
    schemaVersion: "properly-packed-export-v2",
    exportedAt: "2026-06-18T12:00:00.000Z",
    appVersion: "0.23.0",
    databaseVersion: 4,
    tables: Object.fromEntries(exportTableNames.map((name) => [name, []])),
  };
}
