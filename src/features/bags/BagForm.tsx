import { useState, type FormEvent } from "react";
import type { BagInput } from "../../db/repositories/bags-repository";
import type { Bag, BagType, Traveller } from "../../db/types";

const bagTypeOptions: { value: BagType; label: string }[] = [
  { value: "suitcase", label: "Suitcase" },
  { value: "cabin-bag", label: "Cabin bag" },
  { value: "backpack", label: "Backpack" },
  { value: "handbag", label: "Handbag" },
  { value: "pouch", label: "Pouch" },
  { value: "day-bag", label: "Day bag" },
  { value: "camera-bag", label: "Camera bag" },
  { value: "car-storage", label: "Car storage" },
  { value: "worn", label: "Worn" },
  { value: "buy-later", label: "Buy later" },
];

type BagFormProps = {
  initialBag?: Bag;
  onCancel?: () => void;
  onSubmit: (input: BagInput) => Promise<void>;
  submitLabel: string;
  travellers: Traveller[];
  tripId: string;
};

export function BagForm({
  initialBag,
  onCancel,
  onSubmit,
  submitLabel,
  travellers,
  tripId,
}: BagFormProps) {
  const [name, setName] = useState(initialBag?.name ?? "");
  const [bagType, setBagType] = useState<BagType>(
    initialBag?.bagType ?? "suitcase",
  );
  const [ownerTravellerId, setOwnerTravellerId] = useState(
    initialBag?.ownerTravellerId ?? "",
  );
  const [notes, setNotes] = useState(initialBag?.notes ?? "");
  const [isHandLuggage, setIsHandLuggage] = useState(
    initialBag?.isHandLuggage ?? false,
  );
  const [isTravelDay, setIsTravelDay] = useState(
    initialBag?.isTravelDay ?? false,
  );
  const [isCruiseEmbarkation, setIsCruiseEmbarkation] = useState(
    initialBag?.isCruiseEmbarkation ?? false,
  );
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Bag name is required.");
      return;
    }

    setError(undefined);
    setSaving(true);
    try {
      await onSubmit({
        tripId,
        name: name.trim(),
        bagType,
        ownerTravellerId: ownerTravellerId || undefined,
        notes: notes.trim() || undefined,
        isHandLuggage,
        isTravelDay,
        isCruiseEmbarkation,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      aria-label={initialBag ? "Edit bag" : "Create bag"}
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
          <span>Bag name</span>
          <input
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Bag type</span>
          <select
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={bagType}
            onChange={(event) => setBagType(event.target.value as BagType)}
          >
            {bagTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Owner</span>
          <select
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={ownerTravellerId}
            onChange={(event) => setOwnerTravellerId(event.target.value)}
          >
            <option value="">Shared or unowned</option>
            {travellers.map((traveller) => (
              <option key={traveller.id} value={traveller.id}>
                {traveller.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Toggle
          checked={isHandLuggage}
          label="Hand luggage"
          onChange={setIsHandLuggage}
        />
        <Toggle
          checked={isTravelDay}
          label="Travel day"
          onChange={setIsTravelDay}
        />
        <Toggle
          checked={isCruiseEmbarkation}
          label="Cruise embarkation"
          onChange={setIsCruiseEmbarkation}
        />
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

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-lg border border-charcoal/10 bg-cream px-4 text-sm font-medium text-charcoal">
      <input
        checked={checked}
        className="h-5 w-5 accent-teal"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}
