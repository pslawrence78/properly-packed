import { ListChecks, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

export function FirstRunEmptyState() {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase text-teal">First steps</p>
        <h2 className="mt-3 text-2xl font-bold tracking-normal text-charcoal">
          Start by adding your travellers
        </h2>
        <p className="mt-3 text-sm leading-6 text-charcoal/70 sm:text-base">
          Travellers are the people or pets you pack for. Add them first, then
          create a trip and build a packing list around who is travelling.
        </p>
        <ol className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          {[
            "Add travellers",
            "Create a trip",
            "Build the packing list",
          ].map((step, index) => (
            <li
              className="flex min-h-12 items-center gap-3 rounded-lg bg-cream px-4 font-semibold text-charcoal"
              key={step}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal text-xs font-bold text-white">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slateAccent px-5 text-sm font-semibold text-cream shadow-soft"
            to="/travellers?add=1"
          >
            <UserPlus aria-hidden="true" className="h-4 w-4" />
            Add traveller
          </Link>
          <Link
            className="trip-action min-h-12 justify-center gap-2"
            to="/settings/contexts"
          >
            <ListChecks aria-hidden="true" className="h-4 w-4" />
            Manage trip contexts
          </Link>
        </div>
      </div>
    </section>
  );
}
