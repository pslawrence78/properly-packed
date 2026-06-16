import { Plane } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ensureDatabaseReady } from "../../db";
import { getTrip, updateTrip } from "../../db/repositories/trips-repository";
import { listTravellers } from "../../db/repositories/travellers-repository";
import { useAsyncData } from "../../hooks/use-async-data";
import { TripForm } from "./TripForm";

export function EditTripScreen() {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const tripData = useAsyncData(async () => {
    await ensureDatabaseReady();
    const [trip, travellers] = await Promise.all([
      tripId ? getTrip(tripId) : undefined,
      listTravellers(),
    ]);

    if (!trip) {
      throw new Error("Trip not found.");
    }

    return { trip, travellers };
  }, [tripId]);

  return (
    <section className="space-y-5">
      <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
        <p className="inline-flex items-center gap-2 rounded-full bg-tealSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-tealDeep">
          <Plane aria-hidden="true" className="h-4 w-4" />
          Trips
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
          Edit Trip
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
          Update trip details and included travellers.
        </p>
      </div>

      {tripData.state === "loading" ? <TripFormStatus message="Loading trip..." /> : null}
      {tripData.state === "error" ? <TripFormStatus message={tripData.error} /> : null}
      {tripData.state === "ready" ? (
        <TripForm
          initialTrip={tripData.data.trip}
          travellers={tripData.data.travellers}
          submitLabel="Save trip"
          onSubmit={async (trip) => {
            await updateTrip(tripData.data.trip.id, trip);
            navigate(`/trips/${tripData.data.trip.id}`);
          }}
        />
      ) : null}
    </section>
  );
}

function TripFormStatus({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 text-sm text-charcoal/70 shadow-soft">
      {message}
    </section>
  );
}
