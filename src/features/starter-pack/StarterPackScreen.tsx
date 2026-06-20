import { PackagePlus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TripNotFoundState } from "../../components/empty-states/TripNotFoundState";
import { ensureDatabaseReady } from "../../db";
import {
  applyStarterPack,
  previewStarterPack,
  type StarterPackPreview,
} from "../../db/repositories/starter-pack-repository";
import { getTrip } from "../../db/repositories/trips-repository";
import { listTravellers } from "../../db/repositories/travellers-repository";
import { useAsyncData } from "../../hooks/use-async-data";

export function StarterPackScreen() {
  const { tripId } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState("");
  const [templates, setTemplates] = useState<Record<string, boolean>>({});
  const [extras, setExtras] = useState<Record<string, boolean>>({});
  const [bundles, setBundles] = useState<Record<string, boolean>>({});
  const [owners, setOwners] = useState<Record<string, string>>({});
  const [optionals, setOptionals] = useState<Record<string, string[]>>({});

  const starterData = useAsyncData(async () => {
    await ensureDatabaseReady();
    if (!tripId) throw new Error("Trip not found.");
    const [trip, travellers] = await Promise.all([getTrip(tripId), listTravellers()]);
    if (!trip || trip.archivedAt) throw new Error("Trip not found.");
    return previewStarterPack(trip, travellers);
  }, [tripId, refreshKey]);

  async function applySelected(preview: StarterPackPreview) {
    setMessage("");
    const result = await applyStarterPack({
      trip: preview.trip,
      travellers: preview.travellers,
      templateIds: preview.templates
        .filter(({ template, newCount }) => selected(templates, template.id, newCount > 0))
        .map(({ template }) => template.id),
      usefulExtraIds: preview.usefulExtras
        .filter(({ extra, status }) => selected(extras, extra.id, status === "new"))
        .map(({ extra }) => extra.id),
      gadgetBundles: preview.gadgetBundles
        .filter(({ bundle, suggestions }) =>
          selected(
            bundles,
            bundle.id,
            suggestions.some((item) => !item.optional && item.status === "new"),
          ),
        )
        .map((bundle) => ({
          bundleId: bundle.bundle.id,
          ownerTravellerId: owners[bundle.bundle.id] ?? bundle.ownerTraveller?.id ?? "",
          optionalItemIds: optionals[bundle.bundle.id] ?? [],
        }))
        .filter(({ ownerTravellerId }) => ownerTravellerId),
    });
    setMessage(result.summary);
    setRefreshKey((key) => key + 1);
  }

  return (
    <section className="space-y-5">
      {starterData.state === "loading" ? <Status message="Building suggestions..." /> : null}
      {starterData.state === "error" ? (
        starterData.error === "Trip not found." ? <TripNotFoundState /> : <Status message={starterData.error} />
      ) : null}
      {starterData.state === "ready" ? (
        <>
          <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
            <p className="inline-flex items-center gap-2 rounded-full bg-tealSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-tealDeep">
              <PackagePlus aria-hidden="true" className="h-4 w-4" /> Starter Pack
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
              Suggestions for {starterData.data.trip.name}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
              Review deterministic suggestions from your templates, useful extras and gadget bundles before anything is added.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="trip-action" to={`/trips/${starterData.data.trip.id}`}>Trip overview</Link>
              <Link className="trip-action" to={`/trips/${starterData.data.trip.id}/pack`}>Packing list</Link>
            </div>
          </div>

          {message ? <div className="rounded-lg border border-teal/30 bg-teal/10 px-4 py-3 text-sm font-semibold text-charcoal">{message}</div> : null}

          <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
            <h2 className="text-xl font-semibold text-charcoal">Suggested for this trip</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Metric label="New" value={starterData.data.newSuggestionCount} />
              <Metric label="Duplicates" value={starterData.data.duplicateCount} />
              <Metric label="Included" value={starterData.data.alreadyIncluded.length} />
            </div>
          </section>

          <SuggestionSection title="Matching templates" empty="No templates match this trip.">
            {starterData.data.templates.map((preview) => (
              <ChoiceCard
                checked={selected(templates, preview.template.id, preview.newCount > 0)}
                disabled={preview.newCount === 0}
                key={preview.template.id}
                name={preview.template.name}
                reason={preview.reason}
                summary={`${preview.newCount} new · ${preview.duplicateCount} already included`}
                onChange={(checked) => setTemplates((current) => ({ ...current, [preview.template.id]: checked }))}
              />
            ))}
          </SuggestionSection>

          <SuggestionSection title="Useful extras" empty="No useful extras match this trip.">
            {starterData.data.usefulExtras.map((suggestion) => (
              <ChoiceCard
                checked={selected(extras, suggestion.extra.id, suggestion.status === "new")}
                disabled={suggestion.status !== "new"}
                key={suggestion.extra.id}
                name={suggestion.extra.name}
                reason={suggestion.status === "duplicate" ? "Already in this trip." : suggestion.reason}
                summary={suggestion.status === "duplicate" ? "Skipped as duplicate" : suggestion.extra.category}
                onChange={(checked) => setExtras((current) => ({ ...current, [suggestion.extra.id]: checked }))}
              />
            ))}
          </SuggestionSection>

          <SuggestionSection title="Gadget bundles" empty="No gadget bundles match this trip.">
            {starterData.data.gadgetBundles.map((preview) => {
              const defaultSelected = preview.suggestions.some((item) => !item.optional && item.status === "new");
              const ownerId = owners[preview.bundle.id] ?? preview.ownerTraveller?.id ?? "";
              return (
                <article className="rounded-lg border border-charcoal/10 bg-cream p-4" key={preview.bundle.id}>
                  <label className="flex min-h-11 gap-3">
                    <input
                      checked={selected(bundles, preview.bundle.id, defaultSelected)}
                      className="mt-1 h-5 w-5 shrink-0 accent-teal"
                      disabled={!defaultSelected}
                      onChange={(event) => setBundles((current) => ({ ...current, [preview.bundle.id]: event.target.checked }))}
                      type="checkbox"
                    />
                    <span><span className="font-semibold text-charcoal">{preview.bundle.name}</span><span className="block text-sm text-charcoal/65">{preview.reason}</span></span>
                  </label>
                  <label className="mt-3 block text-sm font-medium text-charcoal">Owner
                    <select className="mt-1 min-h-11 w-full rounded-lg border border-charcoal/15 bg-paper px-3" value={ownerId} onChange={(event) => setOwners((current) => ({ ...current, [preview.bundle.id]: event.target.value }))}>
                      <option value="">Choose a traveller</option>
                      {starterData.data.travellers.map((traveller) => <option key={traveller.id} value={traveller.id}>{traveller.name}</option>)}
                    </select>
                  </label>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {preview.suggestions.map((item) => (
                      <li className="rounded-lg bg-paper px-3 py-2 text-sm" key={item.bundleItem.id}>
                        <label className="flex gap-2">
                          {item.optional ? <input checked={(optionals[preview.bundle.id] ?? []).includes(item.bundleItem.id)} disabled={item.status === "duplicate"} onChange={() => toggleOptional(setOptionals, preview.bundle.id, item.bundleItem.id)} type="checkbox" /> : null}
                          <span><span className="font-semibold">{item.bundleItem.name}</span><span className="block text-charcoal/60">{item.status === "duplicate" ? "Already in this trip" : item.optional ? "Optional" : "Required"}</span></span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </SuggestionSection>

          <SuggestionSection title="Already included" empty="No matching items have been added yet.">
            {starterData.data.alreadyIncluded.map((item) => <div className="rounded-lg bg-cream px-4 py-3 text-sm" key={item.id}><span className="font-semibold">{item.name}</span><span className="block text-charcoal/60">Already in this trip · {item.source}</span></div>)}
          </SuggestionSection>

          <div className="sticky bottom-20 z-10 flex flex-wrap gap-3 rounded-lg border border-charcoal/10 bg-paper/95 p-4 shadow-soft backdrop-blur md:bottom-4">
            <button className="min-h-12 flex-1 rounded-lg bg-slateAccent px-5 font-semibold text-cream" onClick={() => void applySelected(starterData.data)} type="button">Apply selected</button>
            <Link className="trip-action min-h-12" to={`/trips/${starterData.data.trip.id}`}>Cancel</Link>
          </div>
        </>
      ) : null}
    </section>
  );
}

function SuggestionSection({ children, empty, title }: { children: React.ReactNode; empty: string; title: string }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6"><h2 className="text-xl font-semibold text-charcoal">{title}</h2><div className="mt-4 grid gap-3">{hasChildren ? children : <p className="text-sm text-charcoal/65">{empty}</p>}</div></section>;
}

function ChoiceCard({ checked, disabled, name, onChange, reason, summary }: { checked: boolean; disabled: boolean; name: string; onChange: (checked: boolean) => void; reason: string; summary: string }) {
  return <label className="flex min-h-14 gap-3 rounded-lg border border-charcoal/10 bg-cream p-4"><input checked={checked} className="mt-1 h-5 w-5 shrink-0 accent-teal" disabled={disabled} onChange={(event) => onChange(event.target.checked)} type="checkbox" /><span><span className="font-semibold text-charcoal">{name}</span><span className="block text-sm leading-6 text-charcoal/65">{reason}</span><span className="block text-xs text-charcoal/55">{summary}</span></span></label>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-cream p-3 text-center"><p className="text-2xl font-bold text-charcoal">{value}</p><p className="text-xs text-charcoal/60">{label}</p></div>; }
function Status({ message }: { message: string }) { return <section className="rounded-lg border border-charcoal/10 bg-paper p-5 text-sm text-charcoal/70 shadow-soft">{message}</section>; }
function selected(values: Record<string, boolean>, id: string, fallback: boolean) { return values[id] ?? fallback; }
function toggleOptional(setter: React.Dispatch<React.SetStateAction<Record<string, string[]>>>, bundleId: string, itemId: string) { setter((current) => { const ids = current[bundleId] ?? []; return { ...current, [bundleId]: ids.includes(itemId) ? ids.filter((id) => id !== itemId) : [...ids, itemId] }; }); }
