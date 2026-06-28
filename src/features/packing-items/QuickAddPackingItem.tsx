import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { PackingItemInput } from "../../db/repositories/packing-items-repository";
import type { PackingItem, PackingPriority, PackingStatus, Traveller } from "../../db/types";
import { searchPackingAutocomplete } from "./autocomplete/packing-autocomplete-search";
import type { ResolvedPackingAutocompleteSuggestion } from "./autocomplete/packing-autocomplete-types";
import {
  formatPackingLabel,
  getPackingStatusLabel,
  packingPriorityOptions,
  packingStatusOptions,
  type QuickAddContextDefault,
} from "./packing-item-utils";

export type QuickAddPackingItemProps = {
  categories: string[];
  defaultContext: QuickAddContextDefault;
  existingItems?: PackingItem[];
  focusRequest?: number;
  onSubmit: (input: PackingItemInput) => Promise<void>;
  travellers: Traveller[];
  tripId: string;
};

export function QuickAddPackingItem({
  categories,
  defaultContext,
  existingItems = [],
  focusRequest = 0,
  onSubmit,
  travellers,
  tripId,
}: QuickAddPackingItemProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<ResolvedPackingAutocompleteSuggestion>();
  const [category, setCategory] = useState(defaultContext.category ?? "misc");
  const [ownershipScope, setOwnershipScope] =
    useState<PackingItem["ownershipScope"]>(defaultContext.ownershipScope);
  const [ownerTravellerId, setOwnerTravellerId] = useState(
    defaultContext.ownerTravellerId,
  );
  const [priority, setPriority] = useState<PackingPriority>("important");
  const [status, setStatus] = useState<PackingStatus>(
    defaultContext.status ?? "needed",
  );
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);

  useEffect(() => {
    if (focusRequest > 0) inputRef.current?.focus();
  }, [focusRequest]);

  useEffect(() => {
    setCategory(defaultContext.category ?? "misc");
    setOwnershipScope(defaultContext.ownershipScope);
    setOwnerTravellerId(defaultContext.ownerTravellerId);
    setPriority("important");
    setStatus(defaultContext.status ?? "needed");
    setSelectedSuggestion(undefined);
    setSuggestionsDismissed(false);
  }, [defaultContext]);

  const suggestions = useMemo(
    () =>
      suggestionsDismissed
        ? []
        : searchPackingAutocomplete(name, {
            categories,
            existingItems,
            quickAddContext: defaultContext,
            travellers,
          }),
    [categories, defaultContext, existingItems, name, suggestionsDismissed, travellers],
  );

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
        ownershipScope,
        ownerTravellerId: ownershipScope === "traveller" ? ownerTravellerId : undefined,
        category,
        quantity: 1,
        priority,
        status,
        bagId: defaultContext.bagId,
      });
      setName("");
      setSelectedSuggestion(undefined);
      setSuggestionsDismissed(false);
      inputRef.current?.focus();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not add item.",
      );
    } finally {
      setSaving(false);
    }
  }

  function updateName(value: string) {
    setName(value);
    setSuggestionsDismissed(false);
    if (selectedSuggestion && value !== selectedSuggestion.entry.name) {
      setSelectedSuggestion(undefined);
      setCategory(defaultContext.category ?? "misc");
      setOwnershipScope(defaultContext.ownershipScope);
      setOwnerTravellerId(defaultContext.ownerTravellerId);
      setPriority("important");
      setStatus(defaultContext.status ?? "needed");
    }
  }

  function selectSuggestion(suggestion: ResolvedPackingAutocompleteSuggestion) {
    setName(suggestion.entry.name);
    setSelectedSuggestion(suggestion);
    setCategory(defaultContext.category ?? suggestion.resolvedCategory ?? "misc");
    setOwnershipScope(
      suggestion.resolvedOwnership?.ownershipScope ?? defaultContext.ownershipScope,
    );
    setOwnerTravellerId(
      suggestion.resolvedOwnership?.ownerTravellerId ??
        defaultContext.ownerTravellerId,
    );
    setPriority(suggestion.entry.priorityHint ?? "important");
    setStatus(defaultContext.status ?? suggestion.entry.statusHint ?? "needed");
    setSuggestionsDismissed(true);
    inputRef.current?.focus();
  }

  function updateOwner(value: string) {
    if (value === "shared" || value === "unassigned") {
      setOwnershipScope(value);
      setOwnerTravellerId(undefined);
      return;
    }
    setOwnershipScope("traveller");
    setOwnerTravellerId(value);
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
              autoComplete="off"
              onChange={(event) => updateName(event.target.value)}
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
        {suggestions.length > 0 ? (
          <div
            aria-label="Packing suggestions"
            className="rounded-lg border border-charcoal/10 bg-cream p-2"
          >
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <p className="text-xs font-semibold uppercase text-charcoal/58">
                Suggestions
              </p>
              <button
                aria-label="Dismiss suggestions"
                className="rounded-lg p-2 text-charcoal/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                onClick={() => setSuggestionsDismissed(true)}
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {suggestions.map((suggestion) => (
                <button
                  aria-label={`${suggestion.entry.name}${suggestion.duplicate ? ", already in this trip" : ""}`}
                  className={`min-h-12 rounded-lg border px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${
                    suggestion.duplicate
                      ? "border-clay/25 bg-clay/10 text-charcoal"
                      : "border-charcoal/10 bg-paper text-charcoal hover:border-teal"
                  }`}
                  key={suggestion.entry.id}
                  onClick={() => selectSuggestion(suggestion)}
                  type="button"
                >
                  <span className="block font-semibold">{suggestion.entry.name}</span>
                  <span className="block text-xs leading-5 text-charcoal/65">
                    {suggestion.resolvedCategory
                      ? formatPackingLabel(suggestion.resolvedCategory)
                      : "Custom category"}
                    {suggestion.duplicate ? " / already added" : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : name.trim().length >= 2 && !selectedSuggestion && !suggestionsDismissed ? (
          <p className="rounded-lg bg-cream px-3 py-2 text-sm text-charcoal/65">
            No suggestions for "{name.trim()}". Custom items still work.
          </p>
        ) : null}
        {selectedSuggestion ? (
          <div className="rounded-lg border border-teal/20 bg-tealSoft/50 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-charcoal">
                  Selected suggestion: {selectedSuggestion.entry.name}
                </p>
                {selectedSuggestion.duplicateReason ? (
                  <p className="mt-1 text-xs font-medium text-charcoal/70">
                    {selectedSuggestion.duplicateReason}
                  </p>
                ) : null}
              </div>
              <button
                className="trip-action min-h-10 justify-center"
                onClick={() => {
                  setSelectedSuggestion(undefined);
                  setSuggestionsDismissed(false);
                }}
                type="button"
              >
                Change
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Owner">
                <select
                  className={controlClass}
                  onChange={(event) => updateOwner(event.target.value)}
                  value={
                    ownershipScope === "traveller"
                      ? ownerTravellerId ?? ""
                      : ownershipScope
                  }
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
                  onChange={(event) => setCategory(event.target.value)}
                  value={category}
                >
                  {categoryOptions(category, categories).map((categoryOption) => (
                    <option key={categoryOption} value={categoryOption}>
                      {formatPackingLabel(categoryOption)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  className={controlClass}
                  onChange={(event) => setStatus(event.target.value as PackingStatus)}
                  value={status}
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
                  onChange={(event) =>
                    setPriority(event.target.value as PackingPriority)
                  }
                  value={priority}
                >
                  {packingPriorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        ) : null}
      </form>
    </section>
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
