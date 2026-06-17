import { useState, type FormEvent } from "react";
import type { PackingItemInput } from "../../db/repositories/packing-items-repository";
import type {
  Bag,
  ItemOwnershipScope,
  PackingItem,
  PackingPriority,
  PackingStatus,
  Traveller,
} from "../../db/types";
import {
  normaliseCategory,
  packingPriorityOptions,
  packingStatusOptions,
} from "./packing-item-utils";

type PackingItemFormProps = {
  bags: Bag[];
  categories: string[];
  initialItem?: PackingItem;
  submitLabel: string;
  travellers: Traveller[];
  tripId: string;
  onCancel?: () => void;
  onSubmit: (input: PackingItemInput) => Promise<void>;
};

export function PackingItemForm({
  bags,
  categories,
  initialItem,
  onCancel,
  onSubmit,
  submitLabel,
  travellers,
  tripId,
}: PackingItemFormProps) {
  const initialOwnershipScope =
    initialItem?.ownershipScope ?? (initialItem?.ownerTravellerId ? "traveller" : "unassigned");
  const [name, setName] = useState(initialItem?.name ?? "");
  const [ownershipScope, setOwnershipScope] =
    useState<ItemOwnershipScope>(initialOwnershipScope);
  const [ownerTravellerId, setOwnerTravellerId] = useState(
    initialItem?.ownerTravellerId ?? "",
  );
  const [responsibleTravellerId, setResponsibleTravellerId] = useState(
    initialItem?.responsibleTravellerId ?? "",
  );
  const [category, setCategory] = useState(initialItem?.category ?? categories[0] ?? "");
  const [quantity, setQuantity] = useState(String(initialItem?.quantity ?? 1));
  const [priority, setPriority] = useState<PackingPriority>(
    initialItem?.priority ?? "important",
  );
  const [status, setStatus] = useState<PackingStatus>(
    initialItem?.status ?? "needed",
  );
  const [bagId, setBagId] = useState(initialItem?.bagId ?? "");
  const [notes, setNotes] = useState(initialItem?.notes ?? "");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Item name is required.");
      return;
    }

    if (ownershipScope === "traveller" && !ownerTravellerId) {
      setError("Select a traveller owner, or choose shared or unassigned.");
      return;
    }

    if (!category.trim()) {
      setError("Category is required.");
      return;
    }

    setError(undefined);
    setSaving(true);
    try {
      await onSubmit({
        tripId,
        name: name.trim(),
        ownershipScope,
        ownerTravellerId:
          ownershipScope === "traveller" ? ownerTravellerId : undefined,
        responsibleTravellerId: responsibleTravellerId || undefined,
        category: normaliseCategory(category),
        quantity: Math.max(1, Number.parseInt(quantity, 10) || 1),
        priority,
        status,
        bagId: bagId || undefined,
        notes: notes.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      aria-label={initialItem ? "Edit packing item" : "Add packing item"}
      className="space-y-4 rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6"
      onSubmit={handleSubmit}
    >
      {error ? (
        <p className="rounded-lg border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-charcoal/80">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Item name</span>
          <input
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Ownership</span>
          <select
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={ownershipScope}
            onChange={(event) =>
              setOwnershipScope(event.target.value as ItemOwnershipScope)
            }
          >
            <option value="unassigned">Unassigned</option>
            <option value="shared">Shared</option>
            <option value="traveller">Traveller</option>
          </select>
        </label>

        {ownershipScope === "traveller" ? (
          <label className="space-y-2 text-sm font-medium text-charcoal">
            <span>Owner traveller</span>
            <select
              className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
              value={ownerTravellerId}
              onChange={(event) => setOwnerTravellerId(event.target.value)}
            >
              <option value="">Select traveller</option>
              {travellers.map((traveller) => (
                <option key={traveller.id} value={traveller.id}>
                  {traveller.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Responsible person</span>
          <select
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={responsibleTravellerId}
            onChange={(event) => setResponsibleTravellerId(event.target.value)}
          >
            <option value="">No specific person</option>
            {travellers.map((traveller) => (
              <option key={traveller.id} value={traveller.id}>
                {traveller.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Category</span>
          <input
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            list="packing-categories"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
          <datalist id="packing-categories">
            {categories.map((categoryOption) => (
              <option key={categoryOption} value={categoryOption} />
            ))}
          </datalist>
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Quantity</span>
          <input
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            min="1"
            type="number"
            inputMode="numeric"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Priority</span>
          <select
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as PackingPriority)
            }
          >
            {packingPriorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Status</span>
          <select
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={status}
            onChange={(event) => setStatus(event.target.value as PackingStatus)}
          >
            {packingStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Bag</span>
          <select
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={bagId}
            onChange={(event) => setBagId(event.target.value)}
          >
            <option value="">Unassigned</option>
            {bags.map((bag) => (
              <option key={bag.id} value={bag.id}>
                {bag.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-2 text-sm font-medium text-charcoal">
        <span>Notes</span>
        <textarea
          className="min-h-24 w-full rounded-lg border border-charcoal/15 bg-cream px-3 py-3 text-base outline-none focus:border-teal"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          className="min-h-11 rounded-lg bg-slateAccent px-4 py-3 text-sm font-semibold text-cream shadow-soft disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          {saving ? "Saving..." : submitLabel}
        </button>
        {onCancel ? (
          <button className="trip-action" onClick={onCancel} type="button">
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
