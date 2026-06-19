import { Cable } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TripNotFoundState } from "../../components/empty-states/TripNotFoundState";
import { ensureDatabaseReady } from "../../db";
import {
  applyGadgetBundleToTrip,
  findMissingDependencies,
  listItemsToCharge,
  listItemsToDownload,
  previewGadgetBundlesForTrip,
  type GadgetBundlePreview,
} from "../../db/repositories/gadget-bundles-repository";
import { listPackingItemsForTrip } from "../../db/repositories/packing-items-repository";
import { getTrip } from "../../db/repositories/trips-repository";
import { listTravellers } from "../../db/repositories/travellers-repository";
import type { PackingItem, Traveller } from "../../db/types";
import { PageSection } from "../../components/layout/PageSection";
import { useAsyncData } from "../../hooks/use-async-data";

export function GadgetPlannerScreen() {
  const { tripId } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedOptionalIds, setSelectedOptionalIds] = useState<Record<string, string[]>>({});
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const gadgetData = useAsyncData(async () => {
    await ensureDatabaseReady();

    if (!tripId) {
      throw new Error("Trip not found.");
    }

    const [trip, travellers, packingItems] = await Promise.all([
      getTrip(tripId),
      listTravellers(),
      listPackingItemsForTrip(tripId),
    ]);

    if (!trip) {
      throw new Error("Trip not found.");
    }

    const previews = await previewGadgetBundlesForTrip(trip, travellers);
    return { trip, travellers, packingItems, previews };
  }, [tripId, refreshKey]);

  const chargeItems = useMemo(
    () =>
      gadgetData.state === "ready"
        ? listItemsToCharge(gadgetData.data.packingItems)
        : [],
    [gadgetData],
  );
  const downloadItems = useMemo(
    () =>
      gadgetData.state === "ready"
        ? listItemsToDownload(gadgetData.data.packingItems)
        : [],
    [gadgetData],
  );
  const missingDependencies = useMemo(
    () =>
      gadgetData.state === "ready"
        ? findMissingDependencies(gadgetData.data.packingItems)
        : [],
    [gadgetData],
  );

  async function refreshAfter(action: Promise<unknown>, success: string) {
    setMessage("");
    await action;
    setMessage(success);
    setRefreshKey((key) => key + 1);
  }

  function toggleOptional(bundleId: string, itemId: string) {
    setSelectedOptionalIds((current) => {
      const currentIds = current[bundleId] ?? [];
      return {
        ...current,
        [bundleId]: currentIds.includes(itemId)
          ? currentIds.filter((id) => id !== itemId)
          : [...currentIds, itemId],
      };
    });
  }

  return (
    <section className="space-y-5">
      {gadgetData.state === "loading" ? (
        <GadgetStatus message="Loading gadget planner..." />
      ) : null}
      {gadgetData.state === "error" ? (
        gadgetData.error === "Trip not found." ? (
          <TripNotFoundState />
        ) : (
          <GadgetStatus message={gadgetData.error} />
        )
      ) : null}
      {gadgetData.state === "ready" ? (
        <>
          <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
            <p className="inline-flex items-center gap-2 rounded-full bg-lilacSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-lilac">
              <Cable aria-hidden="true" className="h-4 w-4" />
              Gadget Planner
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
                  {gadgetData.data.trip.name}
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
                  Apply device kits, create charge/download tasks, and spot
                  missing cable or charger dependencies.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="trip-action" to={`/trips/${gadgetData.data.trip.id}`}>
                  Trip overview
                </Link>
                <Link
                  className="trip-action"
                  to={`/trips/${gadgetData.data.trip.id}/pack`}
                >
                  Packing list
                </Link>
              </div>
            </div>
          </div>

          {message ? (
            <div className="rounded-lg border border-teal/30 bg-teal/10 px-4 py-3 text-sm text-charcoal/78">
              {message}
            </div>
          ) : null}

          <PageSection title="Gadget readiness">
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="To charge" value={`${chargeItems.length}`} />
              <Metric label="To download" value={`${downloadItems.length}`} />
              <Metric label="Missing dependencies" value={`${missingDependencies.length}`} />
            </div>
          </PageSection>

          <PageSection title="Bundle preview">
            {gadgetData.data.previews.length === 0 ? (
              <p className="text-sm text-charcoal/65">
                No gadget bundles match this trip yet.
              </p>
            ) : (
              <div className="grid gap-4">
                {gadgetData.data.previews.map((preview) => (
                  <GadgetBundlePreviewCard
                    key={preview.bundle.id}
                    preview={preview}
                    travellers={gadgetData.data.travellers.filter((traveller) =>
                      gadgetData.data.trip.travellerIds.includes(traveller.id),
                    )}
                    selectedOwnerId={
                      selectedOwnerIds[preview.bundle.id] ??
                      preview.ownerTraveller?.id ??
                      ""
                    }
                    selectedOptionalIds={selectedOptionalIds[preview.bundle.id] ?? []}
                    onApply={() =>
                      refreshAfter(
                        applyGadgetBundleToTrip({
                          bundleId: preview.bundle.id,
                          trip: gadgetData.data.trip,
                          travellers: gadgetData.data.travellers,
                          ownerTravellerId:
                            selectedOwnerIds[preview.bundle.id] ??
                            preview.ownerTraveller?.id ??
                            "",
                          optionalItemIds: selectedOptionalIds[preview.bundle.id] ?? [],
                        }),
                        `${preview.bundle.name} applied.`,
                      )
                    }
                    onToggleOptional={(itemId) =>
                      toggleOptional(preview.bundle.id, itemId)
                    }
                    onSelectOwner={(ownerTravellerId) =>
                      setSelectedOwnerIds((current) => ({
                        ...current,
                        [preview.bundle.id]: ownerTravellerId,
                      }))
                    }
                  />
                ))}
              </div>
            )}
          </PageSection>

          <PageSection title="To charge">
            <PackingItemList items={chargeItems} empty="No charge tasks yet." />
          </PageSection>

          <PageSection title="To download">
            <PackingItemList items={downloadItems} empty="No download tasks yet." />
          </PageSection>

          <PageSection title="Missing dependencies">
            {missingDependencies.length === 0 ? (
              <p className="text-sm text-charcoal/65">
                No missing gadget dependencies detected.
              </p>
            ) : (
              <ul className="grid gap-2">
                {missingDependencies.map((warning) => (
                  <li
                    className="rounded-lg border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-charcoal"
                    key={warning.item.id}
                  >
                    <span className="font-semibold">{warning.item.name}</span>
                    <span className="block text-charcoal/70">
                      {warning.dependencyNotes}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PageSection>
        </>
      ) : null}
    </section>
  );
}

export function GadgetBundlePreviewCard({
  onApply,
  onSelectOwner,
  onToggleOptional,
  preview,
  selectedOwnerId,
  selectedOptionalIds,
  travellers,
}: {
  onApply: () => void;
  onSelectOwner: (ownerTravellerId: string) => void;
  onToggleOptional: (itemId: string) => void;
  preview: GadgetBundlePreview;
  selectedOwnerId: string;
  selectedOptionalIds: string[];
  travellers: Traveller[];
}) {
  const newRequiredCount = preview.suggestions.filter(
    (suggestion) => !suggestion.optional && suggestion.status === "new",
  ).length;
  const selectedOptionalCount = selectedOptionalIds.length;

  return (
    <article className="rounded-lg border border-charcoal/10 bg-cream p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-charcoal">{preview.bundle.name}</h2>
          <p className="mt-1 text-sm leading-6 text-charcoal/70">
            {preview.requiredCount} required, {preview.optionalCount} optional,{" "}
            {preview.duplicateCount} duplicate.
          </p>
          <label className="mt-3 block space-y-1 text-sm font-medium text-charcoal">
            <span>Bundle owner</span>
            <select
              className="min-h-11 w-full rounded-lg border border-charcoal/15 bg-paper px-3 text-sm outline-none focus:border-teal"
              value={selectedOwnerId}
              onChange={(event) => onSelectOwner(event.target.value)}
            >
              <option value="">Choose a traveller</option>
              {travellers.map((traveller) => (
                <option key={traveller.id} value={traveller.id}>
                  {traveller.name}
                </option>
              ))}
            </select>
          </label>
          {!selectedOwnerId ? (
            <p className="mt-2 text-xs leading-5 text-charcoal/60">
              Choose who this gadget bundle is for before applying it.
            </p>
          ) : null}
        </div>
        <button
          className="min-h-11 rounded-lg bg-slateAccent px-4 py-3 text-sm font-semibold text-cream shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!selectedOwnerId || newRequiredCount + selectedOptionalCount === 0}
          onClick={onApply}
          type="button"
        >
          Apply bundle
        </button>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {preview.suggestions.map((suggestion) => (
          <li
            className="rounded-lg bg-paper px-3 py-2 text-sm text-charcoal"
            key={suggestion.bundleItem.id}
          >
            <div className="flex gap-3">
              {suggestion.optional ? (
                <input
                  checked={selectedOptionalIds.includes(suggestion.bundleItem.id)}
                  className="mt-1 h-4 w-4 shrink-0 accent-teal"
                  disabled={suggestion.status === "duplicate"}
                  onChange={() => onToggleOptional(suggestion.bundleItem.id)}
                  type="checkbox"
                />
              ) : null}
              <div>
                <span className="font-semibold">{suggestion.bundleItem.name}</span>
                <span className="block text-charcoal/65">
                  {suggestion.optional ? "Optional" : "Required"} -{" "}
                  {suggestion.status}
                </span>
                {suggestion.bundleItem.preTripTaskType ? (
                  <span className="block text-charcoal/65">
                    Task: {suggestion.bundleItem.preTripTaskType}
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

function PackingItemList({ empty, items }: { empty: string; items: PackingItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-charcoal/65">{empty}</p>;
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <li className="rounded-lg bg-cream px-4 py-3 text-sm text-charcoal" key={item.id}>
          <span className="font-semibold">{item.name}</span>
          <span className="block text-charcoal/65">{item.status}</span>
        </li>
      ))}
    </ul>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-cream p-4">
      <p className="text-sm font-medium text-charcoal/64">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-charcoal">{value}</p>
    </div>
  );
}

function GadgetStatus({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 text-sm text-charcoal/70 shadow-soft">
      {message}
    </section>
  );
}
