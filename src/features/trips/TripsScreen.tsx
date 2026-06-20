import { CalendarDays, MapPin, Plane, UsersRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ensureDatabaseReady } from "../../db";
import {
  getActiveTripId,
  setActiveTripId,
} from "../../db/repositories/app-settings-repository";
import {
  archiveTrip,
  duplicateTripShell,
  listTrips,
} from "../../db/repositories/trips-repository";
import { listTravellers } from "../../db/repositories/travellers-repository";
import type { Traveller, Trip } from "../../db/types";
import { useAsyncData } from "../../hooks/use-async-data";
import { FirstRunEmptyState } from "../../components/empty-states/FirstRunEmptyState";

export function TripsScreen() {
  const [refreshKey, setRefreshKey] = useState(0);
  const trips = useAsyncData(async () => {
    await ensureDatabaseReady();
    const [tripRows, travellers, activeTripId] = await Promise.all([
      listTrips(),
      listTravellers(),
      getActiveTripId(),
    ]);
    return { trips: tripRows, travellers, activeTripId };
  }, [refreshKey]);

  async function refreshAfter(action: Promise<unknown>) {
    await action;
    setRefreshKey((key) => key + 1);
  }

  return (
    <section className="space-y-5">
      <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
        <p className="inline-flex items-center gap-2 rounded-full bg-tealSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-tealDeep">
          <Plane aria-hidden="true" className="h-4 w-4" />
          Trips
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
              Trips
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
              Create, edit and reuse travel plans.
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slateAccent px-4 py-3 text-sm font-semibold text-cream"
            to="/trips/new"
          >
            New trip
          </Link>
        </div>
      </div>

      {trips.state === "loading" ? <TripStatus message="Loading trips..." /> : null}
      {trips.state === "error" ? <TripStatus message={trips.error} /> : null}

      {trips.state === "ready" &&
      trips.data.trips.length === 0 &&
      trips.data.travellers.length === 0 ? (
        <FirstRunEmptyState />
      ) : null}

      {trips.state === "ready" &&
      trips.data.trips.length === 0 &&
      trips.data.travellers.length > 0 ? (
        <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
          <h2 className="text-xl font-bold tracking-normal text-charcoal">
            No trips created yet
          </h2>
          <p className="mt-2 text-sm leading-6 text-charcoal/70">
            Your travellers are ready. Create a trip to start organising what
            everyone needs to pack.
          </p>
          <Link
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-slateAccent px-4 py-3 text-sm font-semibold text-cream"
            to="/trips/new"
          >
            Create trip
          </Link>
        </section>
      ) : null}

      {trips.state === "ready" && trips.data.trips.length > 0 ? (
        <div className="grid gap-4">
          {trips.data.trips.map((trip) => (
            <TripCard
              key={trip.id}
              active={trips.data.activeTripId === trip.id}
              onArchive={() => refreshAfter(archiveTrip(trip.id))}
              onDuplicate={() => refreshAfter(duplicateTripShell(trip.id))}
              onSetActive={() => refreshAfter(setActiveTripId(trip.id))}
              travellers={trips.data.travellers}
              trip={trip}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function TripCard({
  active,
  onArchive,
  onDuplicate,
  onSetActive,
  travellers,
  trip,
}: {
  active: boolean;
  onArchive: () => void;
  onDuplicate: () => void;
  onSetActive: () => void;
  travellers: Traveller[];
  trip: Trip;
}) {
  const travellerNames = travellers
    .filter((traveller) => trip.travellerIds.includes(traveller.id))
    .map((traveller) => traveller.name);
  const accent = getTripAccent(trip.tripType);

  return (
    <article className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-tactile`}
            >
              <MapPin aria-hidden="true" className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-black tracking-normal text-charcoal">
              {trip.name}
            </h2>
            {active ? (
              <span className="rounded-full bg-teal px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                Active
              </span>
            ) : null}
            <span className="rounded-full bg-cream px-3 py-1 text-xs font-bold uppercase tracking-wide text-charcoalSoft">
              {formatTripType(trip.tripType)}
            </span>
          </div>

          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium text-charcoalSoft">
            <CalendarDays aria-hidden="true" className="h-4 w-4 text-teal" />
            <span>
              {trip.startDate} to {trip.endDate} - {trip.nights} nights
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-wide text-charcoalSoft shadow-tactile">
              {trip.status}
            </span>
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {trip.destinations.slice(0, 4).map((destination) => (
              <span
                className="rounded-full bg-blueSoft px-3 py-1 text-xs font-bold text-tealDeep"
                key={destination}
              >
                {destination}
              </span>
            ))}
            {trip.destinations.length === 0 ? (
              <span className="rounded-full bg-cream px-3 py-1 text-xs font-bold text-charcoalSoft">
                Destination not set
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-charcoalSoft">
            <UsersRound aria-hidden="true" className="h-4 w-4 text-coral" />
            <div className="flex -space-x-2">
              {travellerNames.slice(0, 5).map((name) => (
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-tealSoft text-xs font-black text-tealDeep shadow-tactile"
                  key={name}
                  title={name}
                >
                  {name.slice(0, 1).toUpperCase()}
                </span>
              ))}
            </div>
            <span>{travellerNames.join(", ") || "No travellers selected"}</span>
          </div>
        </div>

        <div className="max-w-2xl">
          <div className="flex flex-wrap gap-2">
          <Link className="trip-action" to={`/trips/${trip.id}`}>
            View
          </Link>
          <Link className="trip-action" to={`/trips/${trip.id}/edit`}>
            Edit
          </Link>
          {trip.status === "completed" ? (
            <Link className="trip-action" to={`/trips/${trip.id}/review`}>
              Review trip
            </Link>
          ) : null}
          <button className="trip-action" onClick={onSetActive} type="button">
            Set active
          </button>
          <button
            className="trip-action"
            onClick={() => {
              if (
                window.confirm(
                  `Duplicate “${trip.name}” trip details only? Travellers, dates, destinations, contexts and notes will be copied. Packing items, bags, outfits, itinerary, gadgets and applied templates will not be copied.`,
                )
              ) {
                onDuplicate();
              }
            }}
            type="button"
          >
            Duplicate trip details
          </button>
          {trip.status === "draft" ? (
            <button
              className="trip-action"
              onClick={() => {
                if (
                  window.confirm(
                    `Archive draft “${trip.name}”? It will be hidden from active trip lists, but its saved data will remain on this device.`,
                  )
                ) {
                  onArchive();
                }
              }}
              type="button"
            >
              Archive draft
            </button>
          ) : null}
          </div>
          <p className="mt-3 text-xs leading-5 text-charcoal/60">
            Duplication copies trip details only. Packing items, bags, outfits,
            itinerary, gadgets and applied templates are not copied.
          </p>
        </div>
      </div>
    </article>
  );
}

function getTripAccent(tripType: Trip["tripType"]) {
  const accents: Partial<Record<Trip["tripType"], string>> = {
    "beach-holiday": "from-poolBlue to-amber",
    cruise: "from-teal to-poolBlue",
    "fly-cruise": "from-teal to-coral",
    "theme-park": "from-coral to-amber",
    staycation: "from-green to-sandMuted",
    "cold-weather": "from-poolBlue to-lilac",
    "city-break": "from-charcoal to-amber",
    "short-break": "from-teal to-sandMuted",
    "ex-uk-cruise": "from-tealDeep to-poolBlue",
    "family-visit": "from-green to-teal",
    "multi-centre": "from-lilac to-poolBlue",
    "special-occasion": "from-coral to-lilac",
  };

  return accents[tripType] ?? "from-teal to-poolBlue";
}

function formatTripType(tripType: Trip["tripType"]) {
  return tripType.replace(/-/g, " ");
}

function TripStatus({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 text-sm text-charcoal/70 shadow-soft">
      {message}
    </section>
  );
}
