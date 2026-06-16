import { Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ensureDatabaseReady } from "../../db";
import {
  listUsefulExtras,
  updateUsefulExtraFlags,
} from "../../db/repositories/useful-extras-repository";
import type { UsefulExtra } from "../../db/types";
import { PageSection } from "../../components/layout/PageSection";
import { useAsyncData } from "../../hooks/use-async-data";

export function UsefulExtrasScreen() {
  const [refreshKey, setRefreshKey] = useState(0);
  const extras = useAsyncData(async () => {
    await ensureDatabaseReady();
    return listUsefulExtras();
  }, [refreshKey]);

  async function refreshAfter(action: Promise<unknown>) {
    await action;
    setRefreshKey((key) => key + 1);
  }

  return (
    <section className="space-y-5">
      <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
        <p className="inline-flex items-center gap-2 rounded-full bg-amberSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-charcoal">
          <Sparkles aria-hidden="true" className="h-4 w-4 text-amber" />
          Library
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
              Useful Extras
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
              Small but easy-to-forget things that can be suggested for matching
              trips.
            </p>
          </div>
          <Link className="trip-action shrink-0" to="/library/templates">
            Templates
          </Link>
          <Link className="trip-action shrink-0" to="/library/gadgets">
            Gadget bundles
          </Link>
        </div>
      </div>

      {extras.state === "loading" ? <ExtraStatus message="Loading extras..." /> : null}
      {extras.state === "error" ? <ExtraStatus message={extras.error} /> : null}
      {extras.state === "ready" ? (
        <PageSection title="Seeded useful extras">
          <div className="grid gap-4">
            {extras.data.map((extra) => (
              <UsefulExtraCard
                extra={extra}
                key={extra.id}
                onAlwaysSuggest={() =>
                  refreshAfter(
                    updateUsefulExtraFlags(extra.id, {
                      alwaysSuggest: !extra.alwaysSuggest,
                      neverSuggest: false,
                    }),
                  )
                }
                onForgottenBefore={() =>
                  refreshAfter(
                    updateUsefulExtraFlags(extra.id, {
                      forgottenBefore: !extra.forgottenBefore,
                    }),
                  )
                }
                onNeverSuggest={() =>
                  refreshAfter(
                    updateUsefulExtraFlags(extra.id, {
                      neverSuggest: !extra.neverSuggest,
                      alwaysSuggest: false,
                    }),
                  )
                }
              />
            ))}
          </div>
        </PageSection>
      ) : null}
    </section>
  );
}

function UsefulExtraCard({
  extra,
  onAlwaysSuggest,
  onForgottenBefore,
  onNeverSuggest,
}: {
  extra: UsefulExtra;
  onAlwaysSuggest: () => void;
  onForgottenBefore: () => void;
  onNeverSuggest: () => void;
}) {
  return (
    <article className="rounded-lg border border-charcoal/10 bg-cream p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-charcoal">{extra.name}</h2>
            {extra.alwaysSuggest ? <Badge label="Always suggest" /> : null}
            {extra.neverSuggest ? <Badge label="Never suggest" /> : null}
            {extra.forgottenBefore ? <Badge label="Forgotten before" /> : null}
          </div>
          <p className="mt-2 text-sm text-charcoal/70">
            {extra.category} - {extra.defaultPriority}
          </p>
          <p className="mt-1 text-sm text-charcoal/65">
            {extra.applicableTripTypes.join(", ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="trip-action" onClick={onAlwaysSuggest} type="button">
            {extra.alwaysSuggest ? "Unset always" : "Always suggest"}
          </button>
          <button className="trip-action" onClick={onNeverSuggest} type="button">
            {extra.neverSuggest ? "Unset never" : "Never suggest"}
          </button>
          <button className="trip-action" onClick={onForgottenBefore} type="button">
            {extra.forgottenBefore ? "Unset forgotten" : "Forgotten before"}
          </button>
        </div>
      </div>
    </article>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-charcoal/65">
      {label}
    </span>
  );
}

function ExtraStatus({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 text-sm text-charcoal/70 shadow-soft">
      {message}
    </section>
  );
}
