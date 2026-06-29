import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
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
  focusOnMount?: boolean;
  initialDefaults?: Partial<PackingItem>;
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
  focusOnMount = false,
  initialDefaults,
  initialItem,
  onCancel,
  onSubmit,
  submitLabel,
  travellers,
  tripId,
}: PackingItemFormProps) {
  const initialOwnershipScope =
    initialItem?.ownershipScope ??
    initialDefaults?.ownershipScope ??
    (initialItem?.ownerTravellerId ? "traveller" : "unassigned");
  const [name, setName] = useState(initialItem?.name ?? "");
  const [ownershipScope, setOwnershipScope] =
    useState<ItemOwnershipScope>(initialOwnershipScope);
  const [ownerTravellerId, setOwnerTravellerId] = useState(
    initialItem?.ownerTravellerId ?? initialDefaults?.ownerTravellerId ?? "",
  );
  const [responsibleTravellerId, setResponsibleTravellerId] = useState(
    initialItem?.responsibleTravellerId ??
      initialDefaults?.responsibleTravellerId ??
      "",
  );
  const [category, setCategory] = useState(
    initialItem?.category ?? initialDefaults?.category ?? categories[0] ?? "misc",
  );
  const [quantity, setQuantity] = useState(String(initialItem?.quantity ?? 1));
  const [priority, setPriority] = useState<PackingPriority>(
    initialItem?.priority ?? initialDefaults?.priority ?? "important",
  );
  const [status, setStatus] = useState<PackingStatus>(
    initialItem?.status ?? initialDefaults?.status ?? "needed",
  );
  const [bagId, setBagId] = useState(initialItem?.bagId ?? initialDefaults?.bagId ?? "");
  const [notes, setNotes] = useState(initialItem?.notes ?? "");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusOnMount) {
      nameInputRef.current?.focus();
    }
  }, [focusOnMount]);

  function changeOwnership(nextScope: ItemOwnershipScope) {
    setOwnershipScope(nextScope);
    if (nextScope !== "traveller") {
      setOwnerTravellerId("");
    }
    setError(undefined);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    if (!name.trim()) {
      setError("Enter an item name.");
      return;
    }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      setError("Quantity must be at least 1.");
      return;
    }
    if (ownershipScope === "traveller" && !ownerTravellerId) {
      setError("Select a traveller, or choose Shared or Unassigned.");
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
        category: category.trim() ? normaliseCategory(category) : "misc",
        quantity: parsedQuantity,
        priority,
        status,
        bagId: bagId || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not save item.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      aria-label={initialItem ? "Edit packing item" : "Add packing item"}
      className="space-y-0 rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7"
      onSubmit={handleSubmit}
    >
      {error ? (
        <p
          className="mb-5 rounded-lg border border-clay/30 bg-clay/10 px-4 py-3 text-sm font-medium text-charcoal"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <FormSection title="Item basics">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <Field label="Item name">
            <input
              className={controlClass}
              onChange={(event) => setName(event.target.value)}
              ref={nameInputRef}
              value={name}
            />
          </Field>
          <Field label="Quantity">
            <input
              className={controlClass}
              inputMode="numeric"
              min="1"
              onChange={(event) => setQuantity(event.target.value)}
              type="number"
              value={quantity}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Ownership and responsibility"
        description="Ownership says who the item belongs to. Responsibility says who is making sure it gets packed."
      >
        <fieldset>
          <legend className="sr-only">Ownership</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ["traveller", "Traveller"],
              ["shared", "Shared"],
              ["unassigned", "Unassigned"],
            ] as const).map(([value, label]) => (
              <label
                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-4 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-teal/35 ${
                  ownershipScope === value
                    ? "border-teal bg-tealSoft text-tealDeep"
                    : "border-charcoal/10 bg-cream text-charcoal"
                }`}
                key={value}
              >
                <input
                  checked={ownershipScope === value}
                  className="h-5 w-5 accent-teal"
                  name="ownership"
                  onChange={() => changeOwnership(value)}
                  type="radio"
                  value={value}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          {ownershipScope === "traveller" ? (
            <Field label="Owner traveller">
              <select
                className={controlClass}
                onChange={(event) => setOwnerTravellerId(event.target.value)}
                value={ownerTravellerId}
              >
                <option value="">Select traveller</option>
                {travellers.map((traveller) => (
                  <option key={traveller.id} value={traveller.id}>
                    {traveller.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <div className="rounded-lg bg-cream px-4 py-3 text-sm leading-6 text-charcoal/68">
              {ownershipScope === "shared"
                ? "Use Shared for items used by the group, such as documents, medicine, chargers or sun cream."
                : "Use Unassigned when you want to capture an item now and decide who owns it later."}
            </div>
          )}
          <Field label="Responsible traveller (optional)">
            <select
              className={controlClass}
              onChange={(event) => setResponsibleTravellerId(event.target.value)}
              value={responsibleTravellerId}
            >
              <option value="">No specific person</option>
              {travellers.map((traveller) => (
                <option key={traveller.id} value={traveller.id}>
                  {traveller.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Packing status">
        <Field label="Status">
          <select
            className={`${controlClass} max-w-md`}
            onChange={(event) => setStatus(event.target.value as PackingStatus)}
            value={status}
          >
            {packingStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>
      </FormSection>

      <FormSection title="Category and priority">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <input
              className={controlClass}
              list="packing-categories"
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            />
            <datalist id="packing-categories">
              {categories.map((categoryOption) => (
                <option key={categoryOption} value={categoryOption} />
              ))}
            </datalist>
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
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Bag assignment"
        description="Optional. Choose where this item is packed, move it to another bag, or leave it without a bag."
      >
        <Field label="Bag">
          <select
            className={`${controlClass} max-w-2xl`}
            onChange={(event) => setBagId(event.target.value)}
            value={bagId}
          >
            <option value="">No bag assigned</option>
            {bags.map((bag) => (
              <option key={bag.id} value={bag.id}>{bag.name}</option>
            ))}
          </select>
        </Field>
      </FormSection>

      <FormSection title="Notes">
        <Field label="Notes">
          <textarea
            className={`${controlClass} min-h-28 py-3`}
            onChange={(event) => setNotes(event.target.value)}
            value={notes}
          />
        </Field>
      </FormSection>

      <div className="flex flex-col gap-2 border-t border-charcoal/10 pt-6 sm:flex-row sm:flex-wrap">
        <button
          className="min-h-12 rounded-lg bg-slateAccent px-5 text-sm font-semibold text-cream shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          {saving ? "Saving..." : submitLabel}
        </button>
        {onCancel ? (
          <button className="trip-action min-h-12 justify-center" onClick={onCancel} type="button">
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

const controlClass =
  "min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal focus:ring-2 focus:ring-teal/20";

function FormSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="space-y-4 border-t border-charcoal/10 py-6 first:border-t-0 first:pt-0">
      <div>
        <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-charcoal/65">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block space-y-2 text-sm font-medium text-charcoal">
      <span>{label}</span>
      {children}
    </label>
  );
}
