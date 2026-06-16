import { useState, type FormEvent } from "react";
import type { OutfitItemInput } from "../../db/repositories/outfits-repository";
import type { OutfitItem, PackingItem } from "../../db/types";
import { outfitItemTypeOptions } from "./outfit-utils";

type OutfitItemFormProps = {
  initialItem?: OutfitItem;
  outfitId: string;
  packingItems: PackingItem[];
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (input: OutfitItemInput) => Promise<void>;
};

const outfitItemStatusOptions: { value: OutfitItem["status"]; label: string }[] = [
  { value: "needed", label: "Needed" },
  { value: "packed", label: "Packed" },
  { value: "not-taking", label: "Not taking" },
];

export function OutfitItemForm({
  initialItem,
  outfitId,
  onCancel,
  onSubmit,
  packingItems,
  submitLabel,
}: OutfitItemFormProps) {
  const [values, setValues] = useState({
    name: initialItem?.name ?? "",
    itemType: initialItem?.itemType ?? "top",
    status: initialItem?.status ?? "needed",
    packingItemId: initialItem?.packingItemId ?? "",
    notes: initialItem?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!values.name.trim()) {
      setError("Item name is required.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      await onSubmit({
        outfitId,
        name: values.name,
        itemType: values.itemType as OutfitItemInput["itemType"],
        status: values.status as OutfitItem["status"],
        packingItemId: values.packingItemId || undefined,
        notes: values.notes || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="mt-4 space-y-4 rounded-lg border border-charcoal/10 bg-cream p-4"
      onSubmit={handleSubmit}
    >
      {error ? (
        <p className="rounded-lg border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-charcoal/80">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Item name</span>
          <input
            className="min-h-11 w-full rounded-lg border border-charcoal/15 bg-paper px-3 text-base outline-none focus:border-teal"
            value={values.name}
            onChange={(event) =>
              setValues((current) => ({ ...current, name: event.target.value }))
            }
          />
        </label>

        <SelectField
          label="Type"
          options={outfitItemTypeOptions}
          value={values.itemType}
          onChange={(value) =>
            setValues((current) => ({
              ...current,
              itemType: value as OutfitItemInput["itemType"],
            }))
          }
        />

        <SelectField
          label="Status"
          options={outfitItemStatusOptions}
          value={values.status}
          onChange={(value) =>
            setValues((current) => ({
              ...current,
              status: value as OutfitItem["status"],
            }))
          }
        />

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Linked packing item</span>
          <select
            className="min-h-11 w-full rounded-lg border border-charcoal/15 bg-paper px-3 text-base outline-none focus:border-teal"
            value={values.packingItemId}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                packingItemId: event.target.value,
              }))
            }
          >
            <option value="">No link</option>
            {packingItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-2 text-sm font-medium text-charcoal">
        <span>Notes</span>
        <textarea
          className="min-h-20 w-full rounded-lg border border-charcoal/15 bg-paper px-3 py-3 text-base outline-none focus:border-teal"
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
        className="min-h-11 w-full rounded-lg border border-charcoal/15 bg-paper px-3 text-base outline-none focus:border-teal"
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
