import {
  AlertTriangle,
  BatteryCharging,
  Briefcase,
  CheckCircle2,
  CloudDownload,
  HelpCircle,
  PackageCheck,
  Plane,
  ShoppingBag,
  Sparkles,
  Unplug,
  Users,
  WashingMachine,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ensureDatabaseReady } from "../../db";
import { getActiveTripId } from "../../db/repositories/app-settings-repository";
import { listBagsForTrip } from "../../db/repositories/bags-repository";
import { findMissingDependencies } from "../../db/repositories/gadget-bundles-repository";
import {
  listOutfitItemsForTrip,
  listOutfitsForTrip,
} from "../../db/repositories/outfits-repository";
import { listPackingItemsForTrip } from "../../db/repositories/packing-items-repository";
import { getTrip, listTrips } from "../../db/repositories/trips-repository";
import { listTravellers } from "../../db/repositories/travellers-repository";
import { listUsefulExtraSuggestionsForTrip } from "../../db/repositories/useful-extras-repository";
import type { PackingItem } from "../../db/types";
import { useAsyncData } from "../../hooks/use-async-data";
import { buildDashboardReadiness, type DashboardReadiness } from "./dashboard-utils";
import {
  SHARED_OWNERSHIP_FILTER,
  UNASSIGNED_OWNERSHIP_FILTER,
} from "../packing-items/packing-item-utils";

export function DashboardScreen() {
  const dashboard = useAsyncData(async () => {
    await ensureDatabaseReady();
    const [activeTripId, trips, travellers] = await Promise.all([
      getActiveTripId(),
      listTrips(),
      listTravellers(),
    ]);
    const activeTrip = activeTripId ? await getTrip(activeTripId) : undefined;

    if (!activeTrip) {
      return { activeTrip, tripCount: trips.length };
    }

    const [packingItems, bags, outfits, outfitItems, usefulExtraSuggestions] =
      await Promise.all([
        listPackingItemsForTrip(activeTrip.id),
        listBagsForTrip(activeTrip.id),
        listOutfitsForTrip(activeTrip.id),
        listOutfitItemsForTrip(activeTrip.id),
        listUsefulExtraSuggestionsForTrip(activeTrip, travellers),
      ]);
    const includedTravellers = travellers.filter((traveller) =>
      activeTrip.travellerIds.includes(traveller.id),
    );
    const readiness = buildDashboardReadiness({
      bags,
      outfitItems,
      outfits,
      packingItems,
      travellers: includedTravellers,
    });

    return {
      activeTrip,
      bags,
      packingItems,
      readiness,
      tripCount: trips.length,
      usefulExtraSuggestionCount: usefulExtraSuggestions.filter(
        (suggestion) => suggestion.status === "new",
      ).length,
    };
  }, []);

  return (
    <section className="space-y-5">
      <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
        <p className="text-sm font-semibold uppercase text-teal">Dashboard</p>
        <h1 className="mt-3 text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
          Properly Packed
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
          Active trip readiness, action counts and planning warnings.
        </p>
      </div>

      {dashboard.state === "loading" ? (
        <StatusCard message="Loading readiness dashboard..." />
      ) : null}
      {dashboard.state === "error" ? <StatusCard message={dashboard.error} /> : null}

      {dashboard.state === "ready" && !dashboard.data.activeTrip ? (
      <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
        <p className="text-sm font-semibold uppercase text-teal">Active trip</p>
          <h2 className="mt-3 text-2xl font-semibold text-charcoal">
            No active trip yet
          </h2>
          <p className="mt-2 text-sm leading-6 text-charcoal/70">
            Create a trip, then mark it active from the trip list or trip overview.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="trip-action bg-slateAccent text-cream" to="/trips/new">
              Create trip
            </Link>
            <Link className="trip-action" to="/trips">
              View trips
            </Link>
          </div>
        </section>
      ) : null}

      {dashboard.state === "ready" && dashboard.data.activeTrip && dashboard.data.readiness ? (
        <DashboardContent
          activeTrip={dashboard.data.activeTrip}
          packingItems={dashboard.data.packingItems ?? []}
          readiness={dashboard.data.readiness}
          tripCount={dashboard.data.tripCount}
          usefulExtraSuggestionCount={dashboard.data.usefulExtraSuggestionCount ?? 0}
        />
      ) : null}
    </section>
  );
}

function DashboardContent({
  activeTrip,
  packingItems,
  readiness,
  tripCount,
  usefulExtraSuggestionCount,
}: {
  activeTrip: NonNullable<Awaited<ReturnType<typeof getTrip>>>;
  packingItems: PackingItem[];
  readiness: DashboardReadiness;
  tripCount: number;
  usefulExtraSuggestionCount: number;
}) {
  const missingDependencies = findMissingDependencies(packingItems);

  return (
    <div className="space-y-5">
      <section className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-tealSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-tealDeep">
              <Plane aria-hidden="true" className="h-4 w-4" />
              Active trip
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-normal text-charcoal sm:text-4xl">
              {activeTrip.name}
            </h2>
            <p className="mt-3 text-sm font-medium text-charcoalSoft">
              {activeTrip.startDate} to {activeTrip.endDate} - {activeTrip.nights} nights -{" "}
              {activeTrip.status}
            </p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-charcoalSoft shadow-tactile">
              {readiness.canMarkReady ? (
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-green" />
              ) : (
                <AlertTriangle aria-hidden="true" className="h-4 w-4 text-coral" />
              )}
              {readiness.canMarkReady
                ? "No essential blockers detected."
                : "Readiness blockers need attention."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[9.5rem_minmax(0,1fr)] lg:min-w-[24rem]">
            <div className="flex aspect-square flex-col items-center justify-center rounded-[2rem] border border-teal/20 bg-white/80 p-4 text-center shadow-travel">
              <span className="text-4xl font-black tracking-normal text-tealDeep">
                {readiness.overall.percentPacked}%
              </span>
              <span className="mt-1 text-xs font-bold uppercase tracking-wide text-charcoalSoft">
                packed
              </span>
            </div>
            <div className="flex flex-col justify-center gap-2">
              <Link className="trip-action" to={`/trips/${activeTrip.id}`}>
                Open trip
              </Link>
              <Link className="trip-action" to={`/trips/${activeTrip.id}/pack`}>
                Packing list
              </Link>
              <Link className="trip-action" to="/trips">
                {tripCount} trips
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-semibold text-charcoal">Packing progress</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardMetric
            label="Packed"
            tone="success"
            to={`/trips/${activeTrip.id}/pack?status=packed`}
            value={`${readiness.overall.packedCount}/${readiness.overall.packableCount}`}
          />
          <DashboardMetric
            label="Progress"
            tone="info"
            to={`/trips/${activeTrip.id}/pack`}
            value={`${readiness.overall.percentPacked}%`}
          />
          <DashboardMetric
            label="Essentials not packed"
            tone={readiness.essentialsNotPacked.length > 0 ? "warning" : "success"}
            to={`/trips/${activeTrip.id}/pack?priority=essential`}
            value={`${readiness.essentialsNotPacked.length}`}
          />
          <DashboardMetric
            label="Unassigned items"
            tone={readiness.unassignedCount > 0 ? "warning" : "success"}
            to={`/trips/${activeTrip.id}/pack?owner=${UNASSIGNED_OWNERSHIP_FILTER}`}
            value={`${readiness.unassignedCount}`}
          />
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-cream">
          <div
            className="pp-progress-bar h-full rounded-full bg-teal"
            style={{ width: `${readiness.overall.percentPacked}%` }}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ReadinessList
          title="Traveller readiness"
          items={readiness.travellerReadiness.map((traveller) => ({
            label: traveller.travellerName,
            detail: `${traveller.packedCount}/${traveller.packableCount} packed`,
            percent: traveller.percentPacked,
            to: `/trips/${activeTrip.id}/pack?owner=${traveller.travellerId}`,
          }))}
        />
        <ReadinessList
          title="Shared readiness"
          items={
            readiness.sharedReadiness.packableCount > 0
              ? [
                  {
                    label: readiness.sharedReadiness.travellerName,
                    detail: `${readiness.sharedReadiness.packedCount}/${readiness.sharedReadiness.packableCount} packed`,
                    percent: readiness.sharedReadiness.percentPacked,
                    to: `/trips/${activeTrip.id}/pack?owner=${SHARED_OWNERSHIP_FILTER}`,
                  },
                ]
              : []
          }
        />
        <ReadinessList
          title="Bag readiness"
          items={readiness.bagReadiness.map((bag) => ({
            label: bag.bagName,
            detail: `${bag.packedCount}/${bag.packableCount} packed`,
            percent: bag.percentPacked,
            to: bag.bagId
              ? `/trips/${activeTrip.id}/pack?bag=${bag.bagId}`
              : `/trips/${activeTrip.id}/pack?bag=__unassigned`,
          }))}
        />
      </section>

      <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-semibold text-charcoal">Action counts</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <DashboardMetric
            label="To buy"
            tone="warning"
            to={`/trips/${activeTrip.id}/pack?status=to-buy`}
            value={`${readiness.actionCounts.toBuy}`}
          />
          <DashboardMetric
            label="To wash"
            tone="info"
            to={`/trips/${activeTrip.id}/pack?status=to-wash`}
            value={`${readiness.actionCounts.toWash}`}
          />
          <DashboardMetric
            label="To charge"
            tone="tech"
            to={`/trips/${activeTrip.id}/pack?status=to-charge`}
            value={`${readiness.actionCounts.toCharge}`}
          />
          <DashboardMetric
            label="To download"
            tone="info"
            to={`/trips/${activeTrip.id}/pack?status=to-download`}
            value={`${readiness.actionCounts.toDownload}`}
          />
          <DashboardMetric
            label="To decide"
            tone="style"
            to={`/trips/${activeTrip.id}/pack?status=to-decide`}
            value={`${readiness.actionCounts.toDecide}`}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <DashboardMetric
          label="Missing dependencies"
          tone={readiness.missingDependencyCount > 0 ? "warning" : "default"}
          to={`/trips/${activeTrip.id}/gadgets`}
          value={`${readiness.missingDependencyCount}`}
        />
        <DashboardMetric
          label="Outfit status"
          tone="style"
          to={`/trips/${activeTrip.id}/outfits`}
          value={`${readiness.outfitSummary.packedCount}/${readiness.outfitSummary.outfitCount}`}
        />
        <DashboardMetric
          label="Useful extras"
          tone="success"
          to={`/trips/${activeTrip.id}/templates`}
          value={`${usefulExtraSuggestionCount}`}
        />
      </section>

      {readiness.essentialsNotPacked.length > 0 ||
      readiness.unassignedEssentialItems.length > 0 ||
      missingDependencies.length > 0 ? (
        <section className="rounded-lg border border-clay/30 bg-clay/10 p-5 shadow-soft sm:p-6">
          <h2 className="text-lg font-semibold text-charcoal">Warnings</h2>
          <ul className="mt-4 grid gap-2 text-sm text-charcoal">
            {readiness.essentialsNotPacked.slice(0, 5).map((item) => (
              <li className="rounded-lg bg-paper px-4 py-3" key={item.id}>
                Essential not packed: <span className="font-semibold">{item.name}</span>
              </li>
            ))}
            {readiness.unassignedEssentialItems.slice(0, 5).map((item) => (
              <li className="rounded-lg bg-paper px-4 py-3" key={`owner:${item.id}`}>
                Essential owner undecided:{" "}
                <span className="font-semibold">{item.name}</span>
              </li>
            ))}
            {missingDependencies.slice(0, 5).map((warning) => (
              <li className="rounded-lg bg-paper px-4 py-3" key={warning.item.id}>
                Missing dependency:{" "}
                <span className="font-semibold">{warning.item.name}</span> -{" "}
                {warning.dependencyNotes}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ReadinessList({
  items,
  title,
}: {
  items: { detail: string; label: string; percent: number; to: string }[];
  title: string;
}) {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
      <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-charcoal/65">No items to show yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {items.map((item) => (
            <li className="rounded-lg bg-cream p-4" key={item.label}>
              <Link className="block" to={item.to}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-charcoal">{item.label}</span>
                  <span className="text-sm text-charcoal/65">{item.detail}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper">
                  <div
                    className="pp-progress-bar h-full rounded-full bg-teal"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DashboardMetric({
  label,
  tone = "default",
  to,
  value,
}: {
  label: string;
  tone?: "default" | "warning" | "success" | "info" | "style" | "tech";
  to: string;
  value: string;
}) {
  const Icon = getMetricIcon(label);
  const toneClasses = {
    default: "border-sandMuted/40 bg-white/90 text-teal",
    warning: "border-amber/40 bg-amberSoft/80 text-amber",
    success: "border-green/35 bg-greenSoft/80 text-green",
    info: "border-poolBlue/35 bg-blueSoft/80 text-poolBlue",
    style: "border-coral/35 bg-coralSoft/80 text-coral",
    tech: "border-lilac/35 bg-lilacSoft/80 text-lilac",
  }[tone];

  return (
    <Link
      className={`block rounded-[1.35rem] border p-4 shadow-tactile transition hover:-translate-y-0.5 hover:border-teal ${
        tone === "warning"
          ? "border-amber/40 bg-amberSoft/80"
          : "border-sandMuted/40 bg-white/90"
      }`}
      to={to}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-charcoalSoft">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${toneClasses}`}>
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-black tracking-normal text-charcoal">
        {value}
      </p>
    </Link>
  );
}

function getMetricIcon(label: string) {
  if (label.includes("buy")) {
    return ShoppingBag;
  }

  if (label.includes("wash")) {
    return WashingMachine;
  }

  if (label.includes("charge")) {
    return BatteryCharging;
  }

  if (label.includes("download")) {
    return CloudDownload;
  }

  if (label.includes("decide")) {
    return HelpCircle;
  }

  if (label.includes("dependencies")) {
    return Unplug;
  }

  if (label.includes("Outfit")) {
    return Sparkles;
  }

  if (label.includes("Unassigned")) {
    return Briefcase;
  }

  if (label.includes("Packed") || label.includes("Progress")) {
    return PackageCheck;
  }

  if (label.includes("extras")) {
    return Sparkles;
  }

  return Users;
}

function StatusCard({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 text-sm text-charcoal/70 shadow-soft">
      {message}
    </section>
  );
}
