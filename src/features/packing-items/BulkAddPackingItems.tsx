import { Check, ClipboardList, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { PackingItemInput } from "../../db/repositories/packing-items-repository";
import type {
  Bag,
  ItemOwnershipScope,
  PackingPriority,
  PackingStatus,
  Traveller,
  PackingItem,
} from "../../db/types";
import { buildBulkPackingItemInputs } from "./bulk-capture-commit";
import { buildBulkCaptureRows } from "./bulk-capture-enrichment";
import { parseBulkCaptureText } from "./bulk-capture-parser";
import type { BulkCaptureRow } from "./bulk-capture-types";
import { summariseBulkRows } from "./bulk-capture-utils";
import {
  formatPackingLabel,
  packingPriorityOptions,
  packingStatusOptions,
  type QuickAddContextDefault,
} from "./packing-item-utils";

type BulkAddPackingItemsProps = {
  bags: Bag[];
  categories: string[];
  existingItems: PackingItem[];
  quickAddContext: QuickAddContextDefault;
  travellers: Traveller[];
  tripId: string;
  onCancel: () => void;
  onCommit: (inputs: PackingItemInput[]) => Promise<void>;
};

export function BulkAddPackingItems({
  bags,
  categories,
  existingItems,
  onCancel,
  onCommit,
  quickAddContext,
  travellers,
  tripId,
}: BulkAddPackingItemsProps) {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<BulkCaptureRow[]>();
  const [error, setError] = useState<string>();
  const [committing, setCommitting] = useState(false);
  const [committedCount, setCommittedCount] = useState<number>();
  const summary = useMemo(() => summariseBulkRows(rows ?? []), [rows]);

  function preview() {
    const parsed = parseBulkCaptureText(input);
    if (parsed.length === 0) {
      setError("Paste or type at least one item.");
      setRows(undefined);
      return;
    }
    setError(undefined);
    setCommittedCount(undefined);
    setRows(
      buildBulkCaptureRows(parsed, {
        bags,
        categories,
        existingItems,
        quickAddContext,
        travellers,
        tripId,
      }),
    );
  }

  async function commit() {
    if (!rows) return;
    setError(undefined);
    setCommitting(true);
    try {
      const inputs = buildBulkPackingItemInputs(rows, tripId);
      if (inputs.length === 0) {
        setError("No included rows are ready to add.");
        return;
      }
      await onCommit(inputs);
      setCommittedCount(inputs.length);
      setRows(undefined);
      setInput("");
    } catch (commitError) {
      setError(
        commitError instanceof Error
          ? commitError.message
          : "Could not add these items.",
      );
    } finally {
      setCommitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-teal/25 bg-paper p-4 shadow-soft sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-charcoal">
            <ClipboardList aria-hidden="true" className="h-5 w-5 text-tealDeep" />
            Bulk add
          </h2>
          <p className="mt-1 text-sm leading-6 text-charcoal/65">
            Paste one item per line. Use prefixes like Seb:, quantities like x2,
            and slash notes like / to buy / Gadget bag.
          </p>
        </div>
        <button className="trip-action min-h-11 justify-center" onClick={onCancel} type="button">
          Close
        </button>
      </div>

      {error ? (
        <p
          className="mt-4 rounded-lg border border-clay/30 bg-clay/10 px-4 py-3 text-sm font-medium text-charcoal"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {committedCount !== undefined ? (
        <div className="mt-4 rounded-lg border border-teal/25 bg-tealSoft px-4 py-3 text-sm font-medium text-tealDeep">
          Added {committedCount} {committedCount === 1 ? "item" : "items"} to this trip.
        </div>
      ) : null}

      {!rows ? (
        <div className="mt-4 space-y-3">
          <label className="block space-y-2 text-sm font-medium text-charcoal">
            <span>Packing list</span>
            <textarea
              className="min-h-48 w-full rounded-lg border border-charcoal/15 bg-cream px-3 py-3 text-base outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              onChange={(event) => setInput(event.target.value)}
              placeholder={"swim goggles\nSeb: Toniebox / hand luggage / to charge\nShared: passports / essential"}
              value={input}
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              className="min-h-12 rounded-lg bg-slateAccent px-5 text-sm font-semibold text-cream shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              onClick={preview}
              type="button"
            >
              Preview items
            </button>
            <button className="trip-action min-h-12 justify-center" onClick={onCancel} type="button">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <BulkSummary summary={summary} />
          <div className="space-y-3">
            {rows.map((row) => (
              <BulkPreviewRow
                bags={bags}
                categories={categories}
                key={row.id}
                row={row}
                travellers={travellers}
                onChange={(nextRow) =>
                  setRows((current) =>
                    current?.map((entry) => (entry.id === nextRow.id ? nextRow : entry)),
                  )
                }
              />
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              className="min-h-12 rounded-lg bg-slateAccent px-5 text-sm font-semibold text-cream shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-60"
              disabled={committing}
              onClick={commit}
              type="button"
            >
              {committing ? "Adding..." : `Add ${summary.readyCount} items`}
            </button>
            <button className="trip-action min-h-12 justify-center" onClick={() => setRows(undefined)} type="button">
              Back to input
            </button>
            <button className="trip-action min-h-12 justify-center" onClick={onCancel} type="button">
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function BulkSummary({ summary }: { summary: ReturnType<typeof summariseBulkRows> }) {
  const metrics = [
    ["Lines", summary.parsedCount],
    ["Ready", summary.readyCount],
    ["Skipped", summary.skippedCount],
    ["Warnings", summary.warningCount],
    ["Duplicates", summary.duplicateCount],
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Bulk add summary">
      {metrics.map(([label, value]) => (
        <div className="rounded-lg bg-cream p-3" key={label}>
          <p className="text-xs font-semibold uppercase text-charcoal/58">{label}</p>
          <p className="mt-1 text-xl font-bold text-charcoal">{value}</p>
        </div>
      ))}
    </div>
  );
}

function BulkPreviewRow({
  bags,
  categories,
  onChange,
  row,
  travellers,
}: {
  bags: Bag[];
  categories: string[];
  onChange: (row: BulkCaptureRow) => void;
  row: BulkCaptureRow;
  travellers: Traveller[];
}) {
  const ownerValue =
    row.ownershipScope === "traveller"
      ? row.ownerTravellerId ?? ""
      : row.ownershipScope;

  function update(changes: Partial<BulkCaptureRow>) {
    onChange({ ...row, ...changes });
  }

  function updateOwner(value: string) {
    if (value === "shared" || value === "unassigned") {
      update({
        ownershipScope: value,
        ownerTravellerId: undefined,
        warnings: clearWarnings(row.warnings, "Unknown owner"),
      });
      return;
    }
    update({
      ownershipScope: "traveller",
      ownerTravellerId: value,
      warnings: clearWarnings(row.warnings, "Unknown owner"),
    });
  }

  function updateQuantity(value: string) {
    const parsed = Number(value);
    update({
      quantity: Number.isInteger(parsed) && parsed > 0 ? parsed : row.quantity,
      warnings:
        Number.isInteger(parsed) && parsed > 0
          ? clearWarnings(row.warnings, "Invalid quantity")
          : row.warnings,
    });
  }

  return (
    <article
      className={`rounded-lg border p-4 ${
        row.included
          ? "border-charcoal/10 bg-paper"
          : "border-clay/30 bg-clay/10"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-charcoal/58">
            Line {row.lineNumber}
          </p>
          <p className="mt-1 text-sm leading-6 text-charcoal/68">{row.originalLine.trim()}</p>
        </div>
        <button
          aria-pressed={row.included}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-charcoal/15 bg-cream px-4 text-sm font-semibold text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          onClick={() => update({ included: !row.included })}
          type="button"
        >
          {row.included ? (
            <Check aria-hidden="true" className="h-4 w-4 text-tealDeep" />
          ) : (
            <X aria-hidden="true" className="h-4 w-4 text-clay" />
          )}
          {row.included ? "Included" : "Skipped"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Item name">
          <input
            className={controlClass}
            onChange={(event) =>
              update({
                name: event.target.value,
                warnings: event.target.value.trim()
                  ? clearWarnings(row.warnings, "Enter an item name")
                  : row.warnings,
              })
            }
            value={row.name}
          />
        </Field>
        <Field label="Owner">
          <select
            className={controlClass}
            onChange={(event) => updateOwner(event.target.value)}
            value={ownerValue}
          >
            <option value="unassigned">Unassigned</option>
            <option value="shared">Shared</option>
            {travellers.map((traveller) => (
              <option key={traveller.id} value={traveller.id}>
                {traveller.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select
            className={controlClass}
            onChange={(event) => update({ category: event.target.value })}
            value={row.category}
          >
            {categoryOptions(row.category, categories).map((category) => (
              <option key={category} value={category}>
                {formatPackingLabel(category)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Quantity">
          <input
            className={controlClass}
            min="1"
            onChange={(event) => updateQuantity(event.target.value)}
            type="number"
            value={row.quantity}
          />
        </Field>
        <Field label="Status">
          <select
            className={controlClass}
            onChange={(event) => update({ status: event.target.value as PackingStatus })}
            value={row.status}
          >
            {packingStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            className={controlClass}
            onChange={(event) => update({ priority: event.target.value as PackingPriority })}
            value={row.priority}
          >
            {packingPriorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bag">
          <select
            className={controlClass}
            onChange={(event) => update({ bagId: event.target.value || undefined })}
            value={row.bagId ?? ""}
          >
            <option value="">No bag assigned</option>
            {bags.map((bag) => (
              <option key={bag.id} value={bag.id}>
                {bag.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {row.notes.length > 0 || row.warnings.length > 0 || row.duplicate ? (
        <div className="mt-4 space-y-2 text-sm leading-6 text-charcoal/72">
          {row.duplicateReason ? <p>Duplicate: {row.duplicateReason}</p> : null}
          {row.notes.length > 0 ? <p>Notes: {row.notes.join("; ")}</p> : null}
          {row.warnings.length > 0 ? <p>Warnings: {row.warnings.join(" ")}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

const controlClass =
  "min-h-11 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal focus:ring-2 focus:ring-teal/20";

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium text-charcoal">
      <span>{label}</span>
      {children}
    </label>
  );
}

function categoryOptions(selected: string, categories: string[]) {
  return categories.includes(selected) ? categories : [selected, ...categories];
}

function clearWarnings(warnings: string[], prefix: string) {
  return warnings.filter((warning) => !warning.startsWith(prefix));
}
