import { Library } from "lucide-react";
import { Link } from "react-router-dom";
import { ensureDatabaseReady } from "../../db";
import {
  listTemplateItems,
  listTemplates,
} from "../../db/repositories/templates-repository";
import type { Template, TemplateItem } from "../../db/types";
import { PageSection } from "../../components/layout/PageSection";
import { useAsyncData } from "../../hooks/use-async-data";

type TemplateWithItems = {
  template: Template;
  items: TemplateItem[];
};

export function TemplateLibraryScreen() {
  const templates = useAsyncData(async () => {
    await ensureDatabaseReady();
    const templateRows = await listTemplates();
    const templateItems = await Promise.all(
      templateRows.map(async (template) => ({
        template,
        items: await listTemplateItems(template.id),
      })),
    );

    return templateItems;
  }, []);

  return (
    <section className="space-y-5">
      <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
        <p className="inline-flex items-center gap-2 rounded-full bg-tealSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-tealDeep">
          <Library aria-hidden="true" className="h-4 w-4" />
          Library
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
              Templates
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
              Seeded trip templates that can generate packing suggestions for
              matching trips.
            </p>
          </div>
          <Link className="trip-action shrink-0" to="/library/useful-extras">
            Useful extras
          </Link>
          <Link className="trip-action shrink-0" to="/library/gadgets">
            Gadget bundles
          </Link>
        </div>
      </div>

      {templates.state === "loading" ? (
        <LibraryStatus message="Loading templates..." />
      ) : null}
      {templates.state === "error" ? (
        <LibraryStatus message={templates.error} />
      ) : null}
      {templates.state === "ready" ? (
        <PageSection title="Seeded templates">
          <div className="grid gap-4">
            {templates.data.map((template) => (
              <TemplateCard key={template.template.id} template={template} />
            ))}
          </div>
        </PageSection>
      ) : null}
    </section>
  );
}

function TemplateCard({ template }: { template: TemplateWithItems }) {
  return (
    <article className="rounded-lg border border-charcoal/10 bg-cream p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-charcoal">
            {template.template.name}
          </h2>
          <p className="mt-1 text-sm leading-6 text-charcoal/70">
            {template.template.description}
          </p>
          <p className="mt-2 text-sm text-charcoal/65">
            {template.template.applicableTripTypes.join(", ")}
          </p>
        </div>
        <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-charcoal/65">
          {template.items.length} items
        </span>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {template.items.slice(0, 9).map((item) => (
          <li
            className="rounded-lg bg-paper px-3 py-2 text-sm text-charcoal"
            key={item.id}
          >
            <span className="font-semibold">{item.name}</span>
            <span className="block text-charcoal/65">
              {item.ownerType} - {item.category}
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
