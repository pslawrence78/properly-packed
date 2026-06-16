import { Cable } from "lucide-react";
import { Link } from "react-router-dom";
import { ensureDatabaseReady } from "../../db";
import {
  listGadgetBundleItems,
  listGadgetBundles,
} from "../../db/repositories/gadget-bundles-repository";
import type { GadgetBundle, GadgetBundleItem } from "../../db/types";
import { PageSection } from "../../components/layout/PageSection";
import { useAsyncData } from "../../hooks/use-async-data";

type BundleWithItems = {
  bundle: GadgetBundle;
  items: GadgetBundleItem[];
};

export function GadgetLibraryScreen() {
  const bundles = useAsyncData(async () => {
    await ensureDatabaseReady();
    const bundleRows = await listGadgetBundles();
    return Promise.all(
      bundleRows.map(async (bundle) => ({
        bundle,
        items: await listGadgetBundleItems(bundle.id),
      })),
    );
  }, []);

  return (
    <section className="space-y-5">
      <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
        <p className="inline-flex items-center gap-2 rounded-full bg-lilacSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-lilac">
          <Cable aria-hidden="true" className="h-4 w-4" />
          Library
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
              Gadget Bundles
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
              Reusable device, charger, cable and download kits for trip planning.
            </p>
          </div>
          <Link className="trip-action shrink-0" to="/library/templates">
            Templates
          </Link>
        </div>
      </div>

      {bundles.state === "loading" ? (
        <LibraryStatus message="Loading gadget bundles..." />
      ) : null}
      {bundles.state === "error" ? <LibraryStatus message={bundles.error} /> : null}
      {bundles.state === "ready" ? (
        <PageSection title="Seeded gadget bundles">
          <div className="grid gap-4">
            {bundles.data.map((bundle) => (
              <BundleCard bundle={bundle} key={bundle.bundle.id} />
            ))}
          </div>
        </PageSection>
      ) : null}
    </section>
  );
}

function BundleCard({ bundle }: { bundle: BundleWithItems }) {
  const requiredCount = bundle.items.filter((item) => item.required).length;
  const optionalCount = bundle.items.length - requiredCount;

  return (
    <article className="rounded-lg border border-charcoal/10 bg-cream p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-charcoal">
            {bundle.bundle.name}
          </h2>
          <p className="mt-1 text-sm leading-6 text-charcoal/70">
            {bundle.bundle.notes}
          </p>
          <p className="mt-2 text-sm text-charcoal/65">
            {bundle.bundle.applicableTripTypes.join(", ")}
          </p>
        </div>
        <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-charcoal/65">
          {requiredCount} required, {optionalCount} optional
        </span>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {bundle.items.map((item) => (
          <li className="rounded-lg bg-paper px-3 py-2 text-sm text-charcoal" key={item.id}>
            <span className="font-semibold">{item.name}</span>
            <span className="block text-charcoal/65">
              {item.required ? "Required" : "Optional"} - {item.category}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function LibraryStatus({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 text-sm text-charcoal/70 shadow-soft">
      {message}
    </section>
  );
}
