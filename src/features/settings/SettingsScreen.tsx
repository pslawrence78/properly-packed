import {
  Cable,
  CheckCircle2,
  CircleAlert,
  Download,
  Info,
  Library,
  ListChecks,
  Settings,
  Smartphone,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import {
  APP_NAME,
  APP_RELEASE_LABEL,
  APP_TAGLINE,
  APP_VERSION,
  CACHE_VERSION,
} from "../../lib/app-version";
import { FeaturePreviewCard } from "../../components/cards/FeaturePreviewCard";
import { PageSection } from "../../components/layout/PageSection";
import { useDatabaseStatus } from "../../hooks/use-database-status";
import { usePwaStatus } from "../../hooks/use-pwa-status";
import { createReleaseChecks, formatOnlineState } from "./pwa-status";
import { EXPORT_SCHEMA_VERSION } from "../import-export";

const plannedSettings = [
  "iPhone Safari install",
  "Installed PWA launch",
  "Offline launch",
  "Export/import on device",
];

const managementGroups: Array<{
  title: string;
  links: Array<{
    description: string;
    icon: LucideIcon;
    label: string;
    to: string;
  }>;
}> = [
  {
    title: "Data Safety",
    links: [
      {
        description: "Export a complete local backup or restore one safely.",
        icon: Download,
        label: "Backup & Restore",
        to: "/settings/import-export",
      },
    ],
  },
  {
    title: "People & Trips",
    links: [
      {
        description: "Create and maintain the people included in trips.",
        icon: Users,
        label: "Travellers",
        to: "/travellers",
      },
      {
        description: "Manage reusable climate, stay, transport and activity options.",
        icon: ListChecks,
        label: "Trip Contexts",
        to: "/settings/contexts",
      },
    ],
  },
  {
    title: "Libraries",
    links: [
      {
        description: "Browse reusable packing templates.",
        icon: Library,
        label: "Templates",
        to: "/library/templates",
      },
      {
        description: "Review useful but easy-to-forget items.",
        icon: ListChecks,
        label: "Useful Extras",
        to: "/library/useful-extras",
      },
      {
        description: "Browse reusable device, charger and cable kits.",
        icon: Cable,
        label: "Gadget Bundles",
        to: "/library/gadgets",
      },
    ],
  },
  {
    title: "App",
    links: [
      {
        description: "View app, database, storage and release information.",
        icon: Info,
        label: "Version & Storage",
        to: "/settings#app-details",
      },
    ],
  },
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
          Manage
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
          Settings
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
          Essential local data, traveller, trip-planning and app controls in one
          mobile-friendly place.
        </p>
      </div>

      <PageSection title="Manage Properly Packed">
        <p className="mb-4 max-w-3xl text-sm leading-6 text-charcoal/70">
          Backup this device, manage travellers and trip options, or open your
          reusable packing libraries.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          {managementGroups.map((group) => (
            <section
              className="rounded-lg border border-charcoal/10 bg-cream p-4"
              key={group.title}
            >
              <h2 className="text-base font-semibold text-charcoal">{group.title}</h2>
              <div className="mt-3 grid gap-2">
                {group.links.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      className="flex min-h-14 items-center gap-3 rounded-lg border border-charcoal/10 bg-paper px-4 py-3 text-left transition hover:border-teal/30 hover:bg-tealSoft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                      key={item.to}
                      to={item.to}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tealSoft text-tealDeep">
                        <Icon aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block font-semibold text-charcoal">
                          {item.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-charcoal/65">
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </PageSection>

      <div id="app-details">
        <PageSection title="App details">
          <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg bg-cream p-4">
            <dt className="font-medium text-charcoal/64">Name</dt>
            <dd className="mt-1 font-semibold text-charcoal">{APP_NAME}</dd>
          </div>
          <div className="rounded-lg bg-cream p-4">
            <dt className="font-medium text-charcoal/64">Version</dt>
            <dd className="mt-1 font-semibold text-charcoal">v{APP_VERSION}</dd>
          </div>
          <div className="rounded-lg bg-cream p-4">
            <dt className="font-medium text-charcoal/64">Release status</dt>
            <dd className="mt-1 font-semibold text-tealDeep">{APP_RELEASE_LABEL}</dd>
          </div>
          <div className="rounded-lg bg-cream p-4">
            <dt className="font-medium text-charcoal/64">Cache version</dt>
            <dd className="mt-1 font-semibold text-charcoal">v{CACHE_VERSION}</dd>
          </div>
          <div className="rounded-lg bg-cream p-4">
            <dt className="font-medium text-charcoal/64">Export schema</dt>
            <dd className="mt-1 font-semibold text-charcoal">
              v{EXPORT_SCHEMA_VERSION.replace(/^.*-v/, "")}
            </dd>
          </div>
          <div className="rounded-lg bg-cream p-4 sm:col-span-2 xl:col-span-1">
            <dt className="font-medium text-charcoal/64">Tagline</dt>
            <dd className="mt-1 font-semibold text-charcoal">{APP_TAGLINE}</dd>
          </div>
          </dl>
          <div className="mt-4 rounded-lg border border-teal/20 bg-tealSoft p-4 text-sm leading-6 text-charcoal/75">
            <p className="font-semibold text-charcoal">Local-first and private by design</p>
            <p className="mt-1">
              Your trips and family packing data stay in this browser on this device
              unless you export them. Create a backup before imports, resets, browser
              cleanup or moving to another device.
            </p>
            <Link className="trip-action mt-3" to="/settings/import-export">
              Open Backup &amp; Restore
            </Link>
          </div>
        </PageSection>
      </div>

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
                {databaseStatus.status.travellerCount} saved locally
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

    </section>
  );
}
