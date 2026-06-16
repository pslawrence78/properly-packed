import { describe, expect, it } from "vitest";
import { createReleaseChecks, formatOnlineState } from "../features/settings/pwa-status";

describe("PWA release status helpers", () => {
  it("marks core release checks as ready or manual when capabilities exist", () => {
    const checks = createReleaseChecks({
      hasExport: true,
      hasImport: true,
      hasReset: true,
      hasManifest: true,
      hasServiceWorker: true,
    });

    expect(checks.map((check) => check.status)).toEqual([
      "ready",
      "manual",
      "ready",
      "ready",
      "manual",
    ]);
  });

  it("flags missing install and backup capabilities", () => {
    const checks = createReleaseChecks({
      hasExport: false,
      hasImport: true,
      hasReset: false,
      hasManifest: false,
      hasServiceWorker: false,
    });

    expect(checks.filter((check) => check.status === "attention")).toHaveLength(4);
  });

  it("formats online state labels", () => {
    expect(formatOnlineState(true)).toBe("Online");
    expect(formatOnlineState(false)).toBe("Offline");
  });
});
