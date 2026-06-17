import { X } from "lucide-react";
import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import type { TripInput } from "../../db/repositories/trips-repository";
import type { Traveller, Trip } from "../../db/types";
import {
  calculateTripNights,
  tripStatusOptions,
  tripTypeOptions,
  validateTrip,
  type TripFormValues,
} from "./trip-utils";

type TripFormProps = {
  travellers: Traveller[];
  initialTrip?: Trip;
  submitLabel: string;
  onSubmit: (trip: TripInput) => Promise<void>;
};

type MultiValueFieldName =
  | "destinations"
  | "accommodationTypes"
  | "transportModes"
  | "activityContexts";

type MultiValueDrafts = Record<MultiValueFieldName, string>;

const emptyMultiValueDrafts: MultiValueDrafts = {
  destinations: "",
  accommodationTypes: "",
  transportModes: "",
  activityContexts: "",
};

export function TripForm({
  travellers,
  initialTrip,
  submitLabel,
  onSubmit,
}: TripFormProps) {
  const [values, setValues] = useState<TripFormValues>({
    name: initialTrip?.name ?? "",
    tripType: initialTrip?.tripType ?? "cruise",
    startDate: initialTrip?.startDate ?? "",
    endDate: initialTrip?.endDate ?? "",
    destinations: initialTrip?.destinations ?? [],
    climateProfile: initialTrip?.climateProfile ?? "",
    accommodationTypes: initialTrip?.accommodationTypes ?? [],
    transportModes: initialTrip?.transportModes ?? [],
    activityContexts: initialTrip?.activityContexts ?? [],
    travellerIds:
      initialTrip?.travellerIds ??
      travellers
        .filter((traveller) => traveller.defaultIncluded)
        .map((traveller) => traveller.id),
    status: initialTrip?.status ?? "draft",
    notes: initialTrip?.notes ?? "",
  });
  const [multiValueDrafts, setMultiValueDrafts] =
    useState<MultiValueDrafts>(emptyMultiValueDrafts);
  const [climateProfileValues, setClimateProfileValues] = useState(() =>
    splitClimateProfileValues(initialTrip?.climateProfile ?? ""),
  );
  const [climateProfileDraft, setClimateProfileDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const nights = useMemo(
    () => calculateTripNights(values.startDate, values.endDate),
    [values.startDate, values.endDate],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const committed = commitMultiValueDrafts(values, multiValueDrafts);
    const committedClimateValues = addMultiValueEntry(
      climateProfileValues,
      climateProfileDraft,
    );
    const climateProfile = joinClimateProfileValues(committedClimateValues);
    const committedValues = {
      ...committed.values,
      climateProfile,
    };

    setValues(committedValues);
    setMultiValueDrafts(committed.drafts);
    setClimateProfileValues(committedClimateValues);
    setClimateProfileDraft("");

    const validationErrors = validateTrip(committedValues);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setSaving(true);
    try {
      await onSubmit({
        ...committedValues,
        climateProfile: climateProfile || undefined,
        notes: committedValues.notes?.trim() || undefined,
        nights,
      });
    } finally {
      setSaving(false);
    }
  }

  function toggleTraveller(travellerId: string) {
    setValues((current) => ({
      ...current,
      travellerIds: current.travellerIds.includes(travellerId)
        ? current.travellerIds.filter((id) => id !== travellerId)
        : [...current.travellerIds, travellerId],
    }));
  }

  function updateMultiValueField(field: MultiValueFieldName, nextValues: string[]) {
    setValues((current) => ({ ...current, [field]: nextValues }));
  }

  function updateMultiValueDraft(field: MultiValueFieldName, draft: string) {
    setMultiValueDrafts((current) => ({ ...current, [field]: draft }));
  }

  function addMultiValueDraft(field: MultiValueFieldName) {
    const draft = multiValueDrafts[field];

    setValues((current) => ({
      ...current,
      [field]: addMultiValueEntry(current[field], draft),
    }));
    setMultiValueDrafts((current) => ({
      ...current,
      [field]: draft.trim() ? "" : draft.trim(),
    }));
  }

  function addClimateProfileDraft() {
    setClimateProfileValues((current) =>
      addMultiValueEntry(current, climateProfileDraft),
    );
    setClimateProfileDraft((current) => (current.trim() ? "" : current.trim()));
  }

  return (
    <form
      className="space-y-5 rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7"
      onSubmit={handleSubmit}
    >
      {errors.length > 0 ? (
        <div className="rounded-lg border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-charcoal/80">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Trip name</span>
          <input
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={values.name}
            onChange={(event) =>
              setValues((current) => ({ ...current, name: event.target.value }))
            }
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Trip type</span>
          <select
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={values.tripType}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                tripType: event.target.value as TripFormValues["tripType"],
              }))
            }
          >
            {tripTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Start date</span>
          <input
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            type="date"
            value={values.startDate}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                startDate: event.target.value,
              }))
            }
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>End date</span>
          <input
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            type="date"
            value={values.endDate}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                endDate: event.target.value,
              }))
            }
          />
        </label>
      </div>

      <div className="rounded-lg border border-charcoal/10 bg-cream p-4">
        <p className="text-sm font-medium text-charcoal/65">Nights</p>
        <p className="mt-1 text-2xl font-semibold text-charcoal">{nights}</p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-charcoal">Travellers</legend>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {travellers.map((traveller) => (
            <label
              key={traveller.id}
              className="flex min-h-12 items-center gap-3 rounded-lg border border-charcoal/10 bg-cream px-4 text-sm font-medium text-charcoal"
            >
              <input
                className="h-5 w-5 accent-teal"
                type="checkbox"
                checked={values.travellerIds.includes(traveller.id)}
                onChange={() => toggleTraveller(traveller.id)}
              />
              {traveller.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <MultiValueField
          label="Destinations"
          placeholder="e.g. New York, USA"
          values={values.destinations}
          draft={multiValueDrafts.destinations}
          onDraftChange={(draft) => updateMultiValueDraft("destinations", draft)}
          onAdd={() => addMultiValueDraft("destinations")}
          onChange={(destinations) => updateMultiValueField("destinations", destinations)}
        />

        <MultiValueField
          label="Climate profile"
          placeholder="e.g. warm"
          values={climateProfileValues}
          draft={climateProfileDraft}
          onDraftChange={setClimateProfileDraft}
          onAdd={addClimateProfileDraft}
          onChange={setClimateProfileValues}
        />

        <MultiValueField
          label="Accommodation types"
          placeholder="e.g. Cruise cabin"
          values={values.accommodationTypes}
          draft={multiValueDrafts.accommodationTypes}
          onDraftChange={(draft) =>
            updateMultiValueDraft("accommodationTypes", draft)
          }
          onAdd={() => addMultiValueDraft("accommodationTypes")}
          onChange={(accommodationTypes) =>
            updateMultiValueField("accommodationTypes", accommodationTypes)
          }
        />

        <MultiValueField
          label="Transport modes"
          placeholder="e.g. Taxi or private transfer"
          values={values.transportModes}
          draft={multiValueDrafts.transportModes}
          onDraftChange={(draft) => updateMultiValueDraft("transportModes", draft)}
          onAdd={() => addMultiValueDraft("transportModes")}
          onChange={(transportModes) =>
            updateMultiValueField("transportModes", transportModes)
          }
        />

        <MultiValueField
          label="Activity contexts"
          placeholder="e.g. Cruise formal night"
          values={values.activityContexts}
          draft={multiValueDrafts.activityContexts}
          onDraftChange={(draft) => updateMultiValueDraft("activityContexts", draft)}
          onAdd={() => addMultiValueDraft("activityContexts")}
          onChange={(activityContexts) =>
            updateMultiValueField("activityContexts", activityContexts)
          }
        />

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Status</span>
          <select
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={values.status}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                status: event.target.value as TripFormValues["status"],
              }))
            }
          >
            {tripStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-2 text-sm font-medium text-charcoal">
        <span>Notes</span>
        <textarea
          className="min-h-28 w-full rounded-lg border border-charcoal/15 bg-cream px-3 py-3 text-base outline-none focus:border-teal"
          value={values.notes ?? ""}
          onChange={(event) =>
            setValues((current) => ({ ...current, notes: event.target.value }))
          }
        />
      </label>

      <button
        className="min-h-12 rounded-lg bg-slateAccent px-5 text-sm font-semibold text-cream shadow-soft transition hover:bg-charcoal disabled:cursor-not-allowed disabled:opacity-60"
        disabled={saving}
        type="submit"
      >
        {saving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

function MultiValueField({
  label,
  placeholder,
  values,
  draft,
  onDraftChange,
  onAdd,
  onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  draft: string;
  onDraftChange: (draft: string) => void;
  onAdd: () => void;
  onChange: (values: string[]) => void;
}) {
  const inputId = useMemo(
    () => `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-input`,
    [label],
  );

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onAdd();
    }
  }

  function removeValue(indexToRemove: number) {
    onChange(values.filter((_, index) => index !== indexToRemove));
  }

  return (
    <div className="space-y-2 text-sm font-medium text-charcoal">
      <label className="block" htmlFor={inputId}>
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          className="min-h-12 min-w-0 flex-1 rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <button
          className="min-h-12 shrink-0 rounded-lg border border-teal/30 bg-tealSoft px-4 text-sm font-semibold text-tealDeep transition hover:border-teal hover:bg-teal/15"
          type="button"
          onClick={onAdd}
        >
          Add
        </button>
      </div>
      {values.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label={`${label} entries`}>
          {values.map((value, index) => (
            <li
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-charcoal/10 bg-paper px-3 py-1.5 text-sm font-semibold text-charcoal"
              key={`${value}-${index}`}
            >
              <span className="min-w-0 break-words">{value}</span>
              <button
                className="rounded-full p-0.5 text-charcoal/55 transition hover:bg-clay/10 hover:text-clay"
                type="button"
                onClick={() => removeValue(index)}
                aria-label={`Remove ${value}`}
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function commitMultiValueDrafts(
  values: TripFormValues,
  drafts: MultiValueDrafts,
): { values: TripFormValues; drafts: MultiValueDrafts } {
  const nextValues = { ...values };
  const nextDrafts = { ...drafts };
  const fields = Object.keys(drafts) as MultiValueFieldName[];

  fields.forEach((field) => {
    nextValues[field] = addMultiValueEntry(nextValues[field], drafts[field]);
    nextDrafts[field] = "";
  });

  return { values: nextValues, drafts: nextDrafts };
}

function addMultiValueEntry(values: string[], draft: string) {
  const nextValue = draft.trim();

  if (!nextValue) {
    return values;
  }

  const normalisedNextValue = normaliseMultiValueEntry(nextValue);
  const alreadyExists = values.some(
    (value) => normaliseMultiValueEntry(value) === normalisedNextValue,
  );

  return alreadyExists ? values : [...values, nextValue];
}

function splitClimateProfileValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinClimateProfileValues(values: string[]) {
  return values.join(", ");
}

function normaliseMultiValueEntry(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
