import { Check, Pencil, Plus, RotateCcw, Settings2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ensureDatabaseReady } from "../../db";
import { contextOptionTypes, contextTypeLabels, groupContextOptionsByType } from "../../db/context-options";
import {
  createContextOption,
  deactivateContextOption,
  listContextOptions,
  reactivateContextOption,
  updateContextOption,
} from "../../db/repositories/context-options-repository";
import type { ContextOption, ContextOptionType } from "../../db/types";
import { PageSection } from "../../components/layout/PageSection";
import { useAsyncData } from "../../hooks/use-async-data";

export function ContextsSettingsScreen() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const options = useAsyncData(async () => {
    await ensureDatabaseReady();
    return listContextOptions();
  }, [refreshKey]);

  async function runAction(action: () => Promise<unknown>, success: string) {
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
      setRefreshKey((value) => value + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Something went wrong.");
    }
  }

  const grouped = options.state === "ready"
    ? groupContextOptionsByType(options.data)
    : undefined;

  return (
    <section className="space-y-5">
      <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
        <p className="inline-flex items-center gap-2 rounded-full bg-tealSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-tealDeep">
          <Settings2 aria-hidden="true" className="h-4 w-4" /> Settings
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-normal text-charcoal sm:text-4xl">Trip Contexts</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
              These options are reused across trips and future templates.
            </p>
          </div>
          <Link className="trip-action shrink-0" to="/settings">Settings</Link>
        </div>
      </div>

      {message ? <Status kind="success" message={message} /> : null}
      {error ? <Status kind="error" message={error} /> : null}
      {options.state === "loading" ? <Status message="Loading trip contexts..." /> : null}
      {options.state === "error" ? <Status kind="error" message={options.error} /> : null}

      {grouped ? contextOptionTypes.map((type) => (
        <PageSection key={type} title={contextTypeLabels[type]}>
          <ContextGroup
            type={type}
            options={grouped[type]}
            onCreate={(label, description) =>
              runAction(
                () => createContextOption({ type, label, description }),
                `${contextTypeLabels[type].slice(0, -1)} added.`,
              )
            }
            onUpdate={(id, label, description) =>
              runAction(
                () => updateContextOption(id, { label, description }),
                "Context option updated.",
              )
            }
            onDeactivate={(option) => {
              if (!window.confirm(`Deactivate "${option.label}"? Existing trips will keep displaying it.`)) return Promise.resolve();
              return runAction(() => deactivateContextOption(option.id), "Context option deactivated.");
            }}
            onReactivate={(option) =>
              runAction(() => reactivateContextOption(option.id), "Context option reactivated.")
            }
          />
        </PageSection>
      )) : null}
    </section>
  );
}

function ContextGroup({ type, options, onCreate, onUpdate, onDeactivate, onReactivate }: {
  type: ContextOptionType;
  options: ContextOption[];
  onCreate: (label: string, description: string) => Promise<unknown>;
  onUpdate: (id: string, label: string, description: string) => Promise<unknown>;
  onDeactivate: (option: ContextOption) => Promise<unknown>;
  onReactivate: (option: ContextOption) => Promise<unknown>;
}) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string>();
  const [editingLabel, setEditingLabel] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  async function submitNew(event: FormEvent) {
    event.preventDefault();
    await onCreate(label, description);
    setLabel("");
    setDescription("");
  }

  return (
    <div className="space-y-4">
      <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]" onSubmit={submitNew}>
        <label className="space-y-1 text-sm font-medium text-charcoal">
          <span>Label</span>
          <input aria-label={`New ${type} label`} className="min-h-11 w-full rounded-lg border border-charcoal/15 bg-cream px-3 outline-none focus:border-teal" value={label} onChange={(event) => setLabel(event.target.value)} />
        </label>
        <label className="space-y-1 text-sm font-medium text-charcoal">
          <span>Description (optional)</span>
          <input aria-label={`New ${type} description`} className="min-h-11 w-full rounded-lg border border-charcoal/15 bg-cream px-3 outline-none focus:border-teal" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <button className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-lg bg-slateAccent px-4 text-sm font-semibold text-cream disabled:opacity-50" disabled={!label.trim()} type="submit">
          <Plus aria-hidden="true" className="h-4 w-4" /> Add
        </button>
      </form>

      <ul className="divide-y divide-charcoal/10 border-y border-charcoal/10">
        {options.map((option) => {
          const editing = editingId === option.id;
          return (
            <li className="py-4" key={option.id}>
              {editing ? (
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                  <input aria-label={`Edit ${option.label} label`} className="min-h-11 rounded-lg border border-charcoal/15 bg-cream px-3" value={editingLabel} onChange={(event) => setEditingLabel(event.target.value)} />
                  <input aria-label={`Edit ${option.label} description`} className="min-h-11 rounded-lg border border-charcoal/15 bg-cream px-3" value={editingDescription} onChange={(event) => setEditingDescription(event.target.value)} />
                  <div className="flex gap-2">
                    <button aria-label={`Save ${option.label}`} className="trip-action" type="button" onClick={async () => { await onUpdate(option.id, editingLabel, editingDescription); setEditingId(undefined); }}><Check aria-hidden="true" className="h-4 w-4" /></button>
                    <button aria-label={`Cancel editing ${option.label}`} className="trip-action" type="button" onClick={() => setEditingId(undefined)}><X aria-hidden="true" className="h-4 w-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-charcoal">{option.label}</p>
                      {!option.active || option.archivedAt ? <span className="rounded-full bg-cream px-2 py-1 text-xs font-semibold text-charcoal/60">Inactive</span> : null}
                    </div>
                    {option.description ? <p className="mt-1 text-sm text-charcoal/65">{option.description}</p> : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button aria-label={`Edit ${option.label}`} className="trip-action" type="button" onClick={() => { setEditingId(option.id); setEditingLabel(option.label); setEditingDescription(option.description ?? ""); }}><Pencil aria-hidden="true" className="h-4 w-4" /></button>
                    {option.active && !option.archivedAt ? (
                      <button className="trip-action" type="button" onClick={() => onDeactivate(option)}>Deactivate</button>
                    ) : (
                      <button className="trip-action gap-2" type="button" onClick={() => onReactivate(option)}><RotateCcw aria-hidden="true" className="h-4 w-4" /> Reactivate</button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Status({ message, kind = "neutral" }: { message: string; kind?: "neutral" | "success" | "error" }) {
  const styles = kind === "error" ? "border-clay/30 bg-clay/10" : kind === "success" ? "border-teal/30 bg-teal/10" : "border-charcoal/10 bg-paper";
  return <div className={`rounded-lg border px-4 py-3 text-sm text-charcoal/75 ${styles}`} role="status">{message}</div>;
}
