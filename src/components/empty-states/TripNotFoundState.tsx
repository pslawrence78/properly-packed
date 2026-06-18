import { Link } from "react-router-dom";

export function TripNotFoundState() {
  return (
    <section
      className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7"
      role="alert"
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-teal">
        Trip unavailable
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-normal text-charcoal">
        Trip not found
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-charcoal/75">
        This trip may have been removed, or the link may be out of date. Select an
        existing trip or create a new one to continue.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="trip-action" to="/trips">
          Select a trip
        </Link>
        <Link className="trip-action" to="/trips/new">
          Create trip
        </Link>
      </div>
    </section>
  );
}
