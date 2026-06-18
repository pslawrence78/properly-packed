import {
  CheckCircle2,
  CircleAlert,
  Download,
  ListChecks,
  Settings,
  Smartphone,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Link } from "react-router-dom";
import { APP_NAME, APP_TAGLINE, APP_VERSION } from "../../lib/app-version";
import { FeaturePreviewCard } from "../../components/cards/FeaturePreviewCard";
import { PageSection } from "../../components/layout/PageSection";
import { useDatabaseStatus } from "../../hooks/use-database-status";
import { usePwaStatus } from "../../hooks/use-pwa-status";
import { createReleaseChecks, formatOnlineState } from "./pwa-status";

const plannedSettings = [
  "iPhone Safari install",
  "Installed PWA launch",
  "Offline launch",
  "Export/import on device",
];

export function SettingsScreen() {
  const databaseStatus = useDatabaseStatus();
  const pwaStatus = usePwaStatus();
  const releaseChecks = createReleaseChecks({
    hasExport: true,
    hasImport: true,
    hasReset: true,
    hasManifest: pwaStatus.hasManifest,
    hasServiceWorker: pwaStatus.serviceWorkerSupported,
  });

  return (
    <section className="space-y-5">
      <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
        <p className="inline-flex items-center gap-2 rounded-full bg-tealSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-tealDeep">
          <Settings aria-hidden="true" className="h-4 w-4" />
          Release
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
          Settings
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
          Version details, install readiness and local data tools for the first
          usable Properly Packed release.
        </p>
      </div>

      <PageSection title="App details">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-cream p-4">
            <dt className="font-medium text-charcoal/64">Name</dt>
            <dd className="mt-1 font-semibold text-charcoal">{APP_NAME}</dd>
          </div>
          <div className="rounded-lg bg-cream p-4">
            <dt className="font-medium text-charcoal/64">Version</dt>
            <dd className="mt-1 font-semibold text-charcoal">v{APP_VERSION}</dd>
          </div>
          <div className="rounded-lg bg-cream p-4 sm:col-span-3 xl:col-span-1">
            <dt className="font-medium text-charcoal/64">Tagline</dt>
            <dd className="mt-1 font-semibold text-charcoal">{APP_TAGLINE}</dd>
          </div>
        </dl>
      </PageSection>

      <PageSection title="Local database">
        {databaseStatus.state === "loading" ? (
          <p className="text-sm text-charcoal/70">Preparing local data...</p>
        ) : null}

        {databaseStatus.state === "error" ? (
          <p className="rounded-lg border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-charcoal/78">
            Local database status is unavailable: {databaseStatus.error}
          </p>
        ) : null}

        {databaseStatus.state === "ready" ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg bg-cream p-4">
              <dt className="font-medium text-charcoal/64">Database version</dt>
              <dd className="mt-1 font-semibold text-charcoal">
                v{databaseStatus.status.databaseVersion}
              </dd>
            </div>
            <div className="rounded-lg bg-cream p-4">
              <dt className="font-medium text-charcoal/64">Seed version</dt>
              <dd className="mt-1 font-semibold text-charcoal">
                v{databaseStatus.status.seedVersion}
              </dd>
            </div>
            <div className="rounded-lg bg-cream p-4">
              <dt className="font-medium text-charcoal/64">Travellers</dt>
              <dd className="mt-1 font-semibold text-charcoal">
                {databaseStatus.status.travellerCount} seeded
              </dd>
            </div>
            <div className="rounded-lg bg-cream p-4">
              <dt className="font-medium text-charcoal/64">Foundation data</dt>
              <dd className="mt-1 font-semibold text-charcoal">
                {databaseStatus.status.categoryCount} categories,{" "}
                {databaseStatus.status.bagTypeCount} bag types
              </dd>
            </div>
          </dl>
        ) : null}
      </PageSection>

      <PageSection title="PWA readiness">
        <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg bg-cream p-4">
            <dt className="font-medium text-charcoal/64">Connection</dt>
            <dd className="mt-2 flex items-center gap-2 font-semibold text-charcoal">
              {pwaStatus.isOnline ? (
                <Wifi aria-hidden="true" className="h-4 w-4 text-teal" />
              ) : (
                <WifiOff aria-hidden="true" className="h-4 w-4 text-clay" />
              )}
              {formatOnlineState(pwaStatus.isOnline)}
            </dd>
          </div>
          <div className="rounded-lg bg-cream p-4">
            <dt className="font-medium text-charcoal/64">Manifest</dt>
            <dd className="mt-2 flex items-center gap-2 font-semibold text-charcoal">
              <Smartphone aria-hidden="true" className="h-4 w-4 text-teal" />
              {pwaStatus.hasManifest ? "Present" : "Missing"}
            </dd>
          </div>
          <div className="rounded-lg bg-cream p-4 sm:col-span-2">
            <dt className="font-medium text-charcoal/64">Service worker</dt>
            <dd className="mt-2 font-semibold capitalize text-charcoal">
              {pwaStatus.serviceWorkerState}
            </dd>
            {pwaStatus.updateWaiting ? (
              <p className="mt-2 text-xs font-medium text-teal">
                Update ready after refresh.
              </p>
            ) : null}
          </div>
        </div>
      </PageSection>

      <PageSection title="Release checklist">
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {releaseChecks.map((item) => (
            <li className="rounded-lg bg-cream p-4" key={item.label}>
              <div className="flex items-start gap-3">
                {item.status === "attention" ? (
                  <CircleAlert
                    aria-hidden="true"
                    className="mt-0.5 h-5 w-5 shrink-0 text-clay"
                  />
                ) : (
                  <CheckCircle2
                    aria-hidden="true"
                    className={`mt-0.5 h-5 w-5 shrink-0 ${
                      item.status === "manual" ? "text-amberSoft" : "text-teal"
                    }`}
                  />
                )}
                <div>
                  <p className="font-semibold text-charcoal">{item.label}</p>
                  <p className="mt-1 text-sm leading-6 text-charcoal/70">
                    {item.detail}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection title="Manual device checks">
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {plannedSettings.map((item) => (
            <FeaturePreviewCard key={item} label={item} />
          ))}
        </ul>
      </PageSection>

      <PageSection title="Data tools">
        <div className="flex flex-col gap-3 text-sm text-charcoal/72 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Export a JSON backup or replace this device's local database from a
            previous Properly Packed export.
          </p>
          <Link className="trip-action shrink-0 gap-2" to="/settings/import-export">
            <Download aria-hidden="true" className="h-4 w-4" />
            Import and export
          </Link>
        </div>
      </PageSection>

      <PageSection title="Trip planning options">
        <div className="flex flex-col gap-3 text-sm text-charcoal/72 sm:flex-row sm:items-center sm:justify-between">
          <p>Manage reusable climate, accommodation, transport and activity options.</p>
          <Link className="trip-action shrink-0 gap-2" to="/settings/contexts">
            <ListChecks aria-hidden="true" className="h-4 w-4" /> Manage trip contexts
          </Link>
        </div>
      </PageSection>
    </section>
  );
}
