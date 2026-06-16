import { useState, type FormEvent } from "react";
import type { OutfitInput } from "../../db/repositories/outfits-repository";
import type { Outfit, Traveller } from "../../db/types";
import { outfitStatusOptions, outfitTypeOptions } from "./outfit-utils";

type OutfitFormProps = {
  initialOutfit?: Outfit;
  submitLabel: string;
  travellers: Traveller[];
  tripId: string;
  onCancel: () => void;
  onSubmit: (input: OutfitInput) => Promise<void>;
};

export function OutfitForm({
  initialOutfit,
  onCancel,
  onSubmit,
  submitLabel,
  travellers,
  tripId,
}: OutfitFormProps) {
  const [values, setValues] = useState({
    name: initialOutfit?.name ?? "",
    ownerTravellerId:
      initialOutfit?.ownerTravellerId ??
      travellers.find((traveller) => traveller.name === "Beck")?.id ??
      travellers[0]?.id ??
      "",
    outfitType: initialOutfit?.outfitType ?? "day",
    plannedForDay: initialOutfit?.plannedForDay?.toString() ?? "",
    plannedForDate: initialOutfit?.plannedForDate ?? "",
    activityContext: initialOutfit?.activityContext ?? "",
    status: initialOutfit?.status ?? "planned",
    rewearEligible: initialOutfit?.rewearEligible ?? false,
    rewearCount: initialOutfit?.rewearCount?.toString() ?? "",
    notes: initialOutfit?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!values.name.trim()) {
      setError("Outfit name is required.");
      return;
    }

    if (!values.ownerTravellerId) {
      setError("Choose an owner for this outfit.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      await onSubmit({
        tripId,
        name: values.name,
        ownerTravellerId: values.ownerTravellerId,
        outfitType: values.outfitType as OutfitInput["outfitType"],
        plannedForDay: values.plannedForDay
          ? Number(values.plannedForDay)
          : undefined,
        plannedForDate: values.plannedForDate || undefined,
        activityContext: values.activityContext || undefined,
        status: values.status as OutfitInput["status"],
        rewearEligible: values.rewearEligible,
        rewearCount: values.rewearCount ? Number(values.rewearCount) : undefined,
        notes: values.notes || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="space-y-5 rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6"
      onSubmit={handleSubmit}
    >
      {error ? (
        <p className="rounded-lg border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-charcoal/80">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Outfit name</span>
          <input
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={values.name}
            onChange={(event) =>
              setValues((current) => ({ ...current, name: event.target.value }))
            }
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Owner</span>
          <select
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={values.ownerTravellerId}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                ownerTravellerId: event.target.value,
              }))
            }
          >
            {travellers.map((traveller) => (
              <option key={traveller.id} value={traveller.id}>
                {traveller.name}
              </option>
            ))}
          </select>
        </label>

        <SelectField
          label="Outfit type"
          options={outfitTypeOptions}
          value={values.outfitType}
          onChange={(value) =>
            setValues((current) => ({
              ...current,
              outfitType: value as OutfitInput["outfitType"],
            }))
          }
        />

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Trip day</span>
          <input
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            min="1"
            type="number"
            value={values.plannedForDay}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                plannedForDay: event.target.value,
              }))
            }
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Planned date</span>
          <input
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            type="date"
            value={values.plannedForDate}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                plannedForDate: event.target.value,
              }))
            }
          />
        </label>

        <SelectField
          label="Status"
          options={outfitStatusOptions}
          value={values.status}
          onChange={(value) =>
            setValues((current) => ({
              ...current,
              status: value as OutfitInput["status"],
            }))
          }
        />

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Activity context</span>
          <input
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={values.activityContext}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                activityContext: event.target.value,
              }))
            }
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Rewear count</span>
          <input
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            min="1"
            type="number"
            value={values.rewearCount}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                rewearCount: event.target.value,
              }))
            }
          />
        </label>

        <label className="flex min-h-12 items-center gap-3 rounded-lg border border-charcoal/10 bg-cream px-4 text-sm font-medium text-charcoal">
          <input
            checked={values.rewearEligible}
            className="h-5 w-5 accent-teal"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                rewearEligible: event.target.checked,
              }))
            }
            type="checkbox"
          />
          Rewear eligible
        </label>
      </div>

      <label className="block space-y-2 text-sm font-medium text-charcoal">
        <span>Notes</span>
        <textarea
          className="min-h-24 w-full rounded-lg border border-charcoal/15 bg-cream px-3 py-3 text-base outline-none focus:border-teal"
          value={values.notes}
          onChange={(event) =>
            setValues((current) => ({ ...current, notes: event.target.value }))
          }
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          className="min-h-11 rounded-lg bg-slateAccent px-4 py-3 text-sm font-semibold text-cream shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          {saving ? "Saving..." : submitLabel}
        </button>
        <button className="trip-action" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </form>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  value: string;
}) {
  return (
    <label className="space-y-2 text-sm font-medium text-charcoal">
      <span>{label}</span>
      <select
        className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
