import { Plane } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ensureDatabaseReady } from "../../db";
import { createDefaultBagsForTrip } from "../../db/repositories/bags-repository";
import { createTrip } from "../../db/repositories/trips-repository";
import { listTravellers } from "../../db/repositories/travellers-repository";
import { useAsyncData } from "../../hooks/use-async-data";
import { TripForm } from "./TripForm";

export function CreateTripScreen() {
  const navigate = useNavigate();
  const travellers = useAsyncData(async () => {
    await ensureDatabaseReady();
    return listTravellers();
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

      {travellers.state === "loading" ? (
        <TripFormStatus message="Loading travellers..." />
      ) : null}
      {travellers.state === "error" ? (
        <TripFormStatus message={travellers.error} />
      ) : null}
      {travellers.state === "ready" ? (
        <TripForm
          travellers={travellers.data}
          submitLabel="Create trip"
          onSubmit={async (trip) => {
            const created = await createTrip(trip);
            await createDefaultBagsForTrip(created.id, travellers.data);
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
