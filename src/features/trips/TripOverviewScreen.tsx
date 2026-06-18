import { Map } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { TripNotFoundState } from "../../components/empty-states/TripNotFoundState";
import { ensureDatabaseReady } from "../../db";
import { getContextLabelsByIds } from "../../db/context-options";
import { listContextOptions } from "../../db/repositories/context-options-repository";
import {
  getActiveTripId,
  setActiveTripId,
} from "../../db/repositories/app-settings-repository";
import {
  duplicateTripShell,
  getTrip,
  updateTrip,
} from "../../db/repositories/trips-repository";
import { listTravellers } from "../../db/repositories/travellers-repository";
import { useAsyncData } from "../../hooks/use-async-data";
import { useState } from "react";

export function TripOverviewScreen() {
  const { tripId } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const tripData = useAsyncData(async () => {
    await ensureDatabaseReady();
    const [trip, travellers, activeTripId, contextOptions] = await Promise.all([
      tripId ? getTrip(tripId) : undefined,
      listTravellers(),
      getActiveTripId(),
      listContextOptions(),
    ]);

    if (!trip) {
      throw new Error("Trip not found.");
    }

    return { trip, travellers, activeTripId, contextOptions };
  }, [tripId, refreshKey]);

  async function refreshAfter(action: Promise<unknown>) {
    await action;
    setRefreshKey((key) => key + 1);
  }

  return (
    <section className="space-y-5">
      {tripData.state === "loading" ? <TripStatus message="Loading trip..." /> : null}
      {tripData.state === "error" ? (
        tripData.error === "Trip not found." ? (
          <TripNotFoundState />
        ) : (
          <TripStatus message={tripData.error} />
        )
      ) : null}
      {tripData.state === "ready" ? (
        <>
          <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
            <p className="inline-flex items-center gap-2 rounded-full bg-blueSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-tealDeep">
              <Map aria-hidden="true" className="h-4 w-4" />
              Trip Overview
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
                  {tripData.data.trip.name}
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
                  {tripData.data.trip.startDate} to {tripData.data.trip.endDate} ·{" "}
                  {tripData.data.trip.nights} nights · {tripData.data.trip.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="trip-action" to={`/trips/${tripData.data.trip.id}/edit`}>
                  Edit
                </Link>
                <Link
                  className="trip-action"
                  to={`/trips/${tripData.data.trip.id}/itinerary`}
                >
                  Itinerary
                </Link>
                <button
                  className="trip-action"
                  onClick={() => refreshAfter(setActiveTripId(tripData.data.trip.id))}
                  type="button"
                >
                  {tripData.data.activeTripId === tripData.data.trip.id
                    ? "Active"
                    : "Set active"}
                </button>
                <button
                  className="trip-action"
                  onClick={() => refreshAfter(duplicateTripShell(tripData.data.trip.id))}
                  type="button"
                >
                  Duplicate shell
                </button>
                <button
                  className="trip-action"
                  onClick={() =>
                    refreshAfter(updateTrip(tripData.data.trip.id, { status: "completed" }))
                  }
                  type="button"
                >
                  Mark completed
                </button>
              </div>
            </div>
          </div>

          <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
            <h2 className="text-lg font-semibold text-charcoal">Trip details</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
              <Detail label="Trip type" value={tripData.data.trip.tripType} />
              <Detail
                label="Destinations"
                value={tripData.data.trip.destinations.join(", ") || "Not set"}
              />
              <Detail
                label="Climate"
                value={formatContexts(
                  tripData.data.contextOptions,
                  tripData.data.trip.climateContextIds,
                )}
              />
              <Detail
                label="Accommodation"
                value={
                  formatContexts(
                    tripData.data.contextOptions,
                    tripData.data.trip.accommodationContextIds,
                  )
                }
              />
              <Detail
                label="Transport"
                value={formatContexts(
                  tripData.data.contextOptions,
                  tripData.data.trip.transportContextIds,
                )}
              />
              <Detail
                label="Contexts"
                value={formatContexts(
                  tripData.data.contextOptions,
                  tripData.data.trip.activityContextIds,
                )}
              />
            </dl>
          </section>

          <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
            <h2 className="text-lg font-semibold text-charcoal">Travellers</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {tripData.data.travellers
                .filter((traveller) =>
                  tripData.data.trip.travellerIds.includes(traveller.id),
                )
                .map((traveller) => (
                  <li
                    className="rounded-lg border border-charcoal/10 bg-cream px-4 py-3 text-sm font-semibold text-charcoal"
                    key={traveller.id}
                  >
                    {traveller.name}
                  </li>
                ))}
            </ul>
          </section>

          <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
            <h2 className="text-lg font-semibold text-charcoal">Next areas</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                className="trip-action"
                to={`/trips/${tripData.data.trip.id}/itinerary`}
              >
                Itinerary
              </Link>
              <Link className="trip-action" to={`/trips/${tripData.data.trip.id}/pack`}>
                Packing list
              </Link>
              <Link
                className="trip-action"
                to={`/trips/${tripData.data.trip.id}/templates`}
              >
                Templates
              </Link>
              <Link className="trip-action" to={`/trips/${tripData.data.trip.id}/outfits`}>
                Outfits
              </Link>
              <Link className="trip-action" to={`/trips/${tripData.data.trip.id}/gadgets`}>
                Gadgets
              </Link>
              <Link className="trip-action" to={`/trips/${tripData.data.trip.id}/bags`}>
                Bags
              </Link>
              <Link className="trip-action" to={`/trips/${tripData.data.trip.id}/review`}>
                Review
              </Link>
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}

function formatContexts(
  options: Parameters<typeof getContextLabelsByIds>[0],
  ids: string[] | undefined,
) {
  return getContextLabelsByIds(options, ids ?? []).join(", ") || "Not set";
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-cream p-4">
      <dt className="font-medium text-charcoal/64">{label}</dt>
      <dd className="mt-1 font-semibold text-charcoal">{value}</dd>
    </div>
  );
}

function TripStatus({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 text-sm text-charcoal/70 shadow-soft">
      {message}
    </section>
  );
}
