import { Plus } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { PackingItemInput } from "../../db/repositories/packing-items-repository";
import type { Traveller } from "../../db/types";
import {
  formatPackingLabel,
  getPackingStatusLabel,
  type QuickAddContextDefault,
} from "./packing-item-utils";

export type QuickAddPackingItemProps = {
  defaultContext: QuickAddContextDefault;
  focusRequest?: number;
  onSubmit: (input: PackingItemInput) => Promise<void>;
  travellers: Traveller[];
  tripId: string;
};

export function QuickAddPackingItem({
  defaultContext,
  focusRequest = 0,
  onSubmit,
  travellers,
  tripId,
}: QuickAddPackingItemProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (focusRequest > 0) inputRef.current?.focus();
  }, [focusRequest]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter an item name.");
      inputRef.current?.focus();
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await onSubmit({
        tripId,
        name: name.trim(),
        ownershipScope: defaultContext.ownershipScope,
        ownerTravellerId: defaultContext.ownerTravellerId,
        category: defaultContext.category ?? "misc",
        quantity: 1,
        priority: "important",
        status: defaultContext.status ?? "needed",
        bagId: defaultContext.bagId,
      });
      setName("");
      inputRef.current?.focus();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not add item.",
      );
    } finally {
      setSaving(false);
    }
  }

  const ownerName = travellers.find(
    (traveller) => traveller.id === defaultContext.ownerTravellerId,
  )?.name;
  const ownershipLabel =
    defaultContext.ownershipScope === "shared"
      ? "Shared"
      : defaultContext.ownershipScope === "traveller"
        ? ownerName ?? "selected traveller"
        : "Unassigned";
  const contextParts = [
    ownershipLabel,
    defaultContext.category
      ? formatPackingLabel(defaultContext.category)
      : undefined,
    defaultContext.status ? getPackingStatusLabel(defaultContext.status) : undefined,
    defaultContext.bagId ? "selected bag" : undefined,
  ].filter(Boolean);

  return (
    <section className="rounded-lg border border-teal/25 bg-paper p-4 shadow-soft sm:p-5">
      <div>
        <h2 className="text-lg font-semibold text-charcoal">Quick add</h2>
        <p className="mt-1 text-sm text-charcoal/65">
          Capture an item now as {contextParts.join(" / ")}. You can add more
          detail later.
        </p>
      </div>
      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        {error ? (
          <p
            className="rounded-lg border border-clay/30 bg-clay/10 px-4 py-3 text-sm font-medium text-charcoal"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_auto]">
          <label className="space-y-1 text-sm font-medium text-charcoal">
            <span>Item name</span>
            <input
              className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              onChange={(event) => setName(event.target.value)}
              ref={inputRef}
              value={name}
            />
          </label>
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 self-end rounded-lg bg-slateAccent px-5 text-sm font-semibold text-cream shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
      </form>
    </section>
  );
}
