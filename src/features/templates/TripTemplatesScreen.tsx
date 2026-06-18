import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ensureDatabaseReady } from "../../db";
import {
  addUsefulExtraToTrip,
  listUsefulExtraSuggestionsForTrip,
} from "../../db/repositories/useful-extras-repository";
import {
  applyTemplateToTrip,
  previewTemplatesForTrip,
  type ApplyTemplateResult,
  type TemplatePreview,
} from "../../db/repositories/templates-repository";
import { getTrip } from "../../db/repositories/trips-repository";
import { listTravellers } from "../../db/repositories/travellers-repository";
import type { UsefulExtraSuggestion } from "../../db/repositories/useful-extras-repository";
import { PageSection } from "../../components/layout/PageSection";
import { useAsyncData } from "../../hooks/use-async-data";

export function TripTemplatesScreen() {
  const { tripId } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState("");
  const [applyResult, setApplyResult] = useState<
    { templateName: string; result: ApplyTemplateResult } | undefined
  >();
  const data = useAsyncData(async () => {
    await ensureDatabaseReady();

    if (!tripId) {
      throw new Error("Trip not found.");
    }

    const [trip, travellers] = await Promise.all([getTrip(tripId), listTravellers()]);

    if (!trip) {
      throw new Error("Trip not found.");
    }

    const [templatePreviews, usefulExtras] = await Promise.all([
      previewTemplatesForTrip(trip, travellers),
      listUsefulExtraSuggestionsForTrip(trip, travellers),
    ]);

    return { trip, travellers, templatePreviews, usefulExtras };
  }, [tripId, refreshKey]);

  async function refreshAfter(action: Promise<unknown>, success: string) {
    setMessage("");
    await action;
    setMessage(success);
    setRefreshKey((key) => key + 1);
  }

  async function applyPreview(preview: TemplatePreview) {
    if (data.state !== "ready") {
      throw new Error("Trip not found.");
    }
    setMessage("");
    const result = await applyTemplateToTrip(
      preview.template.id,
      data.data.trip,
      data.data.travellers,
    );
    setApplyResult({ templateName: preview.template.name, result });
    setRefreshKey((key) => key + 1);
  }

  return (
    <section className="space-y-5">
      {data.state === "loading" ? (
        <TemplateStatus message="Loading template suggestions..." />
      ) : null}
      {data.state === "error" ? <TemplateStatus message={data.error} /> : null}
      {data.state === "ready" ? (
        <>
          <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
            <p className="inline-flex items-center gap-2 rounded-full bg-tealSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-tealDeep">
              <ClipboardList aria-hidden="true" className="h-4 w-4" />
              Templates
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
                  {data.data.trip.name}
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
                  Preview template and useful-extra suggestions before adding
                  them to this packing list.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="trip-action" to={`/trips/${data.data.trip.id}`}>
                  Trip overview
                </Link>
                <Link className="trip-action" to={`/trips/${data.data.trip.id}/pack`}>
                  Packing list
                </Link>
              </div>
            </div>
          </div>

          {message ? (
            <div className="rounded-lg border border-teal/30 bg-teal/10 px-4 py-3 text-sm text-charcoal/78">
              {message}
            </div>
          ) : null}

          {applyResult ? (
            <section
              aria-live="polite"
              className="rounded-lg border border-teal/30 bg-teal/10 p-4 text-sm text-charcoal/78"
            >
              <p className="font-semibold text-charcoal">
                {applyResult.templateName} template applied
              </p>
              <p className="mt-1 leading-6">
                {applyResult.result.inserted} added, {applyResult.result.skippedDuplicates}{" "}
                skipped as duplicates, and {applyResult.result.skippedUnmatched} unresolved or
                context-mismatched.
              </p>
              <Link
                className="trip-action mt-3 min-h-11 justify-center"
                to={`/trips/${data.data.trip.id}/pack`}
              >
                Open packing list
              </Link>
            </section>
          ) : null}

          <PageSection title="Template preview">
            {data.data.templatePreviews.length === 0 ? (
              <p className="text-sm text-charcoal/65">
                No seeded templates match this trip yet.
              </p>
            ) : (
              <div className="grid gap-4">
                {data.data.templatePreviews.map((preview) => (
                  <TemplatePreviewCard
                    key={preview.template.id}
                    preview={preview}
                    onApply={() => applyPreview(preview)}
                  />
                ))}
              </div>
            )}
          </PageSection>

          <PageSection title="Useful extras">
            {data.data.usefulExtras.length === 0 ? (
              <p className="text-sm text-charcoal/65">
                No useful extras match this trip yet.
              </p>
            ) : (
              <div className="grid gap-3">
                {data.data.usefulExtras.map((suggestion) => (
                  <UsefulExtraSuggestionRow
                    key={suggestion.extra.id}
                    suggestion={suggestion}
                    onAdd={() =>
                      refreshAfter(
                        addUsefulExtraToTrip(
                          suggestion.extra.id,
                          data.data.trip,
                          data.data.travellers,
                        ),
                        `${suggestion.extra.name} added.`,
                      )
                    }
                  />
                ))}
              </div>
            )}
          </PageSection>
        </>
      ) : null}
    </section>
  );
}

export function TemplatePreviewCard({
  onApply,
  preview,
}: {
  onApply: () => Promise<void> | void;
  preview: TemplatePreview;
}) {
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string>();

  async function confirmAndApply() {
    if (
      !window.confirm(
        `Apply ${preview.newCount} new ${preview.newCount === 1 ? "item" : "items"} from “${preview.template.name}”? Existing packing items will not be changed.`,
      )
    ) {
      return;
    }

    setError(undefined);
    setApplying(true);
    try {
      await onApply();
    } catch (applyError) {
      setError(
        applyError instanceof Error ? applyError.message : "Could not apply template.",
      );
    } finally {
      setApplying(false);
    }
  }

  return (
    <article className="rounded-lg border border-charcoal/10 bg-cream p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-charcoal">
            {preview.template.name}
          </h2>
          <p className="mt-1 text-sm leading-6 text-charcoal/70">
            {preview.newCount} new, {preview.duplicateCount} duplicates,{" "}
            {preview.skippedCount} skipped.
          </p>
          {preview.template.description ? (
            <p className="mt-2 text-sm leading-6 text-charcoal/65">
              {preview.template.description}
            </p>
          ) : null}
        </div>
        <button
          className="min-h-11 rounded-lg bg-slateAccent px-4 py-3 text-sm font-semibold text-cream shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
          disabled={preview.newCount === 0 || applying}
          onClick={() => void confirmAndApply()}
          type="button"
        >
          {applying ? "Applying..." : `Apply ${preview.newCount} new ${preview.newCount === 1 ? "item" : "items"}`}
        </button>
      </div>
      {error ? (
        <p className="mt-3 rounded-lg border border-clay/30 bg-clay/10 px-3 py-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {preview.suggestions.map((suggestion) => (
          <li
            className={`rounded-lg border px-4 py-3 text-sm text-charcoal ${
              suggestion.status === "new"
                ? "border-teal/20 bg-paper"
                : "border-charcoal/10 bg-charcoal/5"
            }`}
            key={suggestion.key}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="font-semibold">{suggestion.templateItem.name}</span>
              <span className="rounded-full bg-cream px-2 py-1 text-xs font-semibold capitalize text-charcoal/70">
                {suggestion.status}
              </span>
            </div>
            <span className="mt-2 block text-charcoal/70">
              {formatTemplateOwnership(suggestion)} · {formatLabel(suggestion.templateItem.category)}
            </span>
            <span className="mt-1 block text-charcoal/65">
              {formatLabel(suggestion.templateItem.priority)} · {formatLabel(suggestion.packingStatus)}
            </span>
            <span className="mt-2 block text-xs font-medium text-charcoal/60">
              Source: {preview.template.name} template
            </span>
            <span className="mt-1 block text-sm leading-5 text-charcoal/68">
              {suggestion.reason}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function formatLabel(value: string) {
  return value.replace(/-/g, " ");
}

function formatTemplateOwnership(
  suggestion: TemplatePreview["suggestions"][number],
) {
  if (suggestion.ownershipScope === "shared") {
    return "Shared";
  }

  if (suggestion.ownershipScope === "unassigned") {
    return "Unassigned";
  }

  return suggestion.ownerTraveller?.name ?? "No matching traveller";
}

function UsefulExtraSuggestionRow({
  onAdd,
  suggestion,
}: {
  onAdd: () => void;
  suggestion: UsefulExtraSuggestion;
}) {
  return (
    <article className="rounded-lg border border-charcoal/10 bg-cream p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-charcoal">
            {suggestion.extra.name}
          </h2>
          <p className="mt-1 text-sm text-charcoal/65">
            {suggestion.extra.category} - {suggestion.extra.defaultPriority} -{" "}
            {suggestion.status}
          </p>
        </div>
        <button
          className="trip-action"
          disabled={suggestion.status !== "new"}
          onClick={onAdd}
          type="button"
        >
          Add to trip
        </button>
      </div>
    </article>
  );
}

function TemplateStatus({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 text-sm text-charcoal/70 shadow-soft">
      {message}
    </section>
  );
}
