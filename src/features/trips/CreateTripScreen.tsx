import { Plane, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ensureDatabaseReady } from "../../db";
import { listContextOptions } from "../../db/repositories/context-options-repository";
import { createTrip } from "../../db/repositories/trips-repository";
import { listTravellers } from "../../db/repositories/travellers-repository";
import { useAsyncData } from "../../hooks/use-async-data";
import { TripForm } from "./TripForm";

export function CreateTripScreen() {
  const navigate = useNavigate();
  const formData = useAsyncData(async () => {
    await ensureDatabaseReady();
    const [travellers, contextOptions] = await Promise.all([
      listTravellers(),
      listContextOptions(),
    ]);
    return { travellers, contextOptions };
  }, []);

  return (
    <section className="space-y-5">
      <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
        <p className="inline-flex items-center gap-2 rounded-full bg-tealSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-tealDeep">
          <Plane aria-hidden="true" className="h-4 w-4" />
          Trips
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
          Create Trip
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
          Capture the trip basics, dates and included travellers.
        </p>
      </div>

      {formData.state === "loading" ? (
        <TripFormStatus message="Loading trip options..." />
      ) : null}
      {formData.state === "error" ? (
        <TripFormStatus message={formData.error} />
      ) : null}
      {formData.state === "ready" && formData.data.travellers.length === 0 ? (
        <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
          <h2 className="text-2xl font-bold tracking-normal text-charcoal">
            Add a traveller before creating a trip
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-charcoal/70 sm:text-base">
            Every trip needs at least one traveller so the app can organise
            packing by person, shared items and unassigned items.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slateAccent px-5 text-sm font-semibold text-cream shadow-soft"
              to="/travellers?add=1&returnTo=%2Ftrips%2Fnew"
            >
              <UserPlus aria-hidden="true" className="h-4 w-4" />
              Add traveller
            </Link>
            <Link className="trip-action min-h-12 justify-center" to="/trips">
              Back to trips
            </Link>
          </div>
        </section>
      ) : null}
      {formData.state === "ready" && formData.data.travellers.length > 0 ? (
        <TripForm
          travellers={formData.data.travellers}
          contextOptions={formData.data.contextOptions}
          submitLabel="Create trip"
          onSubmit={async (trip) => {
            const created = await createTrip(trip);
            navigate(`/trips/${created.id}`);
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
