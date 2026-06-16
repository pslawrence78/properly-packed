export type ReleaseCheckStatus = "ready" | "manual" | "attention";

export type ReleaseCheck = {
  label: string;
  status: ReleaseCheckStatus;
  detail: string;
};

export function createReleaseChecks({
  hasExport,
  hasImport,
  hasReset,
  hasServiceWorker,
  hasManifest,
}: {
  hasExport: boolean;
  hasImport: boolean;
  hasReset: boolean;
  hasServiceWorker: boolean;
  hasManifest: boolean;
}): ReleaseCheck[] {
  return [
    {
      label: "Install metadata",
      status: hasManifest ? "ready" : "attention",
      detail: hasManifest
        ? "Manifest, theme colour and mobile web app metadata are present."
        : "Manifest metadata needs attention before install testing.",
    },
    {
      label: "Offline shell",
      status: hasServiceWorker ? "manual" : "attention",
      detail: hasServiceWorker
        ? "Service worker is available; verify offline launch after one online visit."
        : "This browser does not expose service worker support.",
    },
    {
      label: "Backups",
      status: hasExport && hasImport ? "ready" : "attention",
      detail:
        hasExport && hasImport
          ? "JSON export and validated replacement import are available."
          : "Backup import/export needs a final pass.",
    },
    {
      label: "Destructive actions",
      status: hasReset ? "ready" : "attention",
      detail: hasReset
        ? "Import replacement and data reset require explicit confirmation."
        : "Reset tooling should not ship without confirmation.",
    },
    {
      label: "Device checks",
      status: "manual",
      detail: "Run iPhone Safari, installed PWA, export, import and offline checks on device.",
    },
  ];
}

export function formatOnlineState(isOnline: boolean) {
  return isOnline ? "Online" : "Offline";
}
