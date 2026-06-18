import { Plus, X } from "lucide-react";
import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import type { TripInput } from "../../db/repositories/trips-repository";
import type {
  ContextOption,
  ContextOptionType,
  Traveller,
  Trip,
} from "../../db/types";
import {
  calculateTripNights,
  tripStatusOptions,
  tripTypeOptions,
  validateTrip,
  type TripFormValues,
} from "./trip-utils";

type TripFormProps = {
  travellers: Traveller[];
  contextOptions: ContextOption[];
  initialTrip?: Trip;
  submitLabel: string;
  onSubmit: (trip: TripInput) => Promise<void>;
};

export function TripForm({
  travellers,
  contextOptions,
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
    climateContextIds: initialTrip?.climateContextIds ?? [],
    accommodationContextIds: initialTrip?.accommodationContextIds ?? [],
    transportContextIds: initialTrip?.transportContextIds ?? [],
    activityContextIds: initialTrip?.activityContextIds ?? [],
    travellerIds:
      initialTrip?.travellerIds ??
      travellers
        .filter((traveller) => traveller.defaultIncluded)
        .map((traveller) => traveller.id),
    status: initialTrip?.status ?? "draft",
    notes: initialTrip?.notes ?? "",
  });
  const [destinationDraft, setDestinationDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const nights = useMemo(
    () => calculateTripNights(values.startDate, values.endDate),
    [values.startDate, values.endDate],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const destinations = addMultiValueEntry(values.destinations, destinationDraft);
    const committedValues = { ...values, destinations };
    setValues(committedValues);
    setDestinationDraft("");

    const validationErrors = validateTrip(committedValues, contextOptions);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setSaving(true);
    try {
      await onSubmit({
        ...committedValues,
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
    setErrors((current) =>
      current.filter(
        (error) => error !== "Select at least one traveller for this trip.",
      ),
    );
  }

  const travellerError = errors.includes(
    "Select at least one traveller for this trip.",
  );
  const summaryErrors = errors.filter(
    (error) => error !== "Select at least one traveller for this trip.",
  );

  return (
    <form
      className="space-y-5 rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7"
      onSubmit={handleSubmit}
    >
      {summaryErrors.length > 0 ? (
        <div
          className="rounded-lg border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-charcoal/80"
          role="alert"
        >
          {summaryErrors.map((error) => <p key={error}>{error}</p>)}
        </div>
      ) : null}

      <FormSection title="Trip basics">
        <TextField
          label="Trip name"
          value={values.name}
          onChange={(name) => setValues((current) => ({ ...current, name }))}
        />
      </FormSection>

      <FormSection title="Dates">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_10rem]">
          <DateField
            label="Start date"
            value={values.startDate}
            onChange={(startDate) =>
              setValues((current) => ({ ...current, startDate }))
            }
          />
          <DateField
            label="End date"
            value={values.endDate}
            onChange={(endDate) =>
              setValues((current) => ({ ...current, endDate }))
            }
          />
          <div className="rounded-lg border border-charcoal/10 bg-cream p-3 sm:col-span-2 lg:col-span-1">
            <p className="text-sm font-medium text-charcoal/65">Nights</p>
            <p className="mt-1 text-2xl font-semibold text-charcoal">{nights}</p>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Travellers"
        description="Choose everyone who is going on this trip."
      >
        <fieldset aria-describedby={travellerError ? "traveller-error" : undefined}>
          <legend className="sr-only">Select travellers</legend>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {travellers.map((traveller) => {
              const selected = values.travellerIds.includes(traveller.id);
              return (
                <label
                  key={traveller.id}
                  className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-teal/35 ${
                    selected
                      ? "border-teal bg-tealSoft text-tealDeep"
                      : "border-charcoal/10 bg-cream text-charcoal"
                  }`}
                >
                  <input
                    className="h-5 w-5 accent-teal"
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleTraveller(traveller.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words">{traveller.name}</span>
                    <span className="block text-xs font-medium capitalize text-charcoal/60">
                      {traveller.travellerType === "dog"
                        ? "Pet"
                        : traveller.travellerType}
                    </span>
                  </span>
                  {selected ? <span className="text-xs">Selected</span> : null}
                </label>
              );
            })}
          </div>
          {travellerError ? (
            <p
              className="mt-3 rounded-lg border border-clay/30 bg-clay/10 px-4 py-3 text-sm font-medium text-charcoal"
              id="traveller-error"
            >
              Select at least one traveller for this trip.
            </p>
          ) : null}
        </fieldset>
      </FormSection>

      <FormSection title="Trip type">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-charcoal">
            <span>Trip type</span>
            <select
              className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
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
            <span>Status</span>
            <select
              className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
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
      </FormSection>

      <FormSection
        title="Destinations"
        description="Add each place as a complete name, including spaces and commas."
      >
        <DestinationField
          values={values.destinations}
          draft={destinationDraft}
          onDraftChange={setDestinationDraft}
          onAdd={() => {
            setValues((current) => ({
              ...current,
              destinations: addMultiValueEntry(current.destinations, destinationDraft),
            }));
            if (destinationDraft.trim()) setDestinationDraft("");
          }}
          onChange={(destinations) =>
            setValues((current) => ({ ...current, destinations }))
          }
        />
      </FormSection>

      <FormSection title="Trip contexts">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-2xl text-sm leading-6 text-charcoal/70">
            Contexts help templates suggest better packing items. You can manage
            the available options in Settings.
          </p>
          <Link
            className="trip-action min-h-11 shrink-0 justify-center"
            to="/settings/contexts"
          >
            Manage contexts
          </Link>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <ContextMultiSelect
            label="Climate Profiles"
            type="climate"
            options={contextOptions}
            selectedIds={values.climateContextIds}
            onChange={(climateContextIds) =>
              setValues((current) => ({ ...current, climateContextIds }))
            }
          />
          <ContextMultiSelect
            label="Accommodation Types"
            type="accommodation"
            options={contextOptions}
            selectedIds={values.accommodationContextIds}
            onChange={(accommodationContextIds) =>
              setValues((current) => ({ ...current, accommodationContextIds }))
            }
          />
          <ContextMultiSelect
            label="Transport Modes"
            type="transport"
            options={contextOptions}
            selectedIds={values.transportContextIds}
            onChange={(transportContextIds) =>
              setValues((current) => ({ ...current, transportContextIds }))
            }
          />
          <ContextMultiSelect
            label="Activity Contexts"
            type="activity"
            options={contextOptions}
            selectedIds={values.activityContextIds}
            onChange={(activityContextIds) =>
              setValues((current) => ({ ...current, activityContextIds }))
            }
          />
        </div>
      </FormSection>

      <FormSection title="Notes">
        <label className="block space-y-2 text-sm font-medium text-charcoal">
          <span className="sr-only">Notes</span>
          <textarea
            aria-label="Notes"
            className="min-h-28 w-full rounded-lg border border-charcoal/15 bg-cream px-3 py-3 text-base outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            value={values.notes ?? ""}
            onChange={(event) =>
              setValues((current) => ({ ...current, notes: event.target.value }))
            }
          />
        </label>
      </FormSection>

      <button
        className="min-h-12 w-full rounded-lg bg-slateAccent px-5 text-sm font-semibold text-cream shadow-soft transition hover:bg-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        disabled={saving}
        type="submit"
      >
        {saving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

function FormSection({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="space-y-4 border-t border-charcoal/10 pt-6 first:border-t-0 first:pt-0">
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

function ContextMultiSelect({
  label,
  type,
  options,
  selectedIds,
  onChange,
}: {
  label: string;
  type: ContextOptionType;
  options: ContextOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [pendingId, setPendingId] = useState("");
  const typeOptions = options.filter((option) => option.type === type);
  const available = typeOptions.filter(
    (option) => option.active && !option.archivedAt && !selectedIds.includes(option.id),
  );
  const optionsById = new Map(typeOptions.map((option) => [option.id, option]));

  function addPending() {
    if (!pendingId || selectedIds.includes(pendingId)) return;
    onChange([...selectedIds, pendingId]);
    setPendingId("");
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-charcoal">{label}</legend>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          aria-label={label}
          className="min-h-12 min-w-0 flex-1 rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          value={pendingId}
          onChange={(event) => setPendingId(event.target.value)}
        >
          <option value="">Select an option</option>
          {available.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        <button
          aria-label={`Add ${label}`}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg border border-teal/30 bg-tealSoft px-4 text-sm font-semibold text-tealDeep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-45 sm:w-auto"
          disabled={!pendingId}
          onClick={addPending}
          type="button"
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> Add
        </button>
      </div>
      {selectedIds.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label={`${label} selections`}>
          {selectedIds.map((id) => {
            const option = optionsById.get(id);
            return (
              <li
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-charcoal/10 bg-cream px-3 py-1.5 text-sm font-semibold text-charcoal"
                key={id}
              >
                <span className="min-w-0 break-words">
                  {option?.label ?? "Unknown context"}
                </span>
                {option && (!option.active || option.archivedAt) ? (
                  <span className="rounded-full bg-paper px-2 py-0.5 text-xs font-medium text-charcoal/60">
                    Inactive
                  </span>
                ) : null}
                <button
                  aria-label={`Remove ${option?.label ?? "Unknown context"}`}
                  className="rounded-full p-1 text-charcoal/55 hover:bg-clay/10 hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                  onClick={() => onChange(selectedIds.filter((selectedId) => selectedId !== id))}
                  type="button"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </fieldset>
  );
}

function DestinationField({ values, draft, onDraftChange, onAdd, onChange }: {
  values: string[];
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onChange: (values: string[]) => void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onAdd();
    }
  }
  return (
    <div className="space-y-2 text-sm font-medium text-charcoal">
      <label className="block" htmlFor="destinations-input">Destinations</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="destinations-input"
          className="min-h-12 min-w-0 flex-1 rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. New York, USA"
        />
        <button className="min-h-12 shrink-0 rounded-lg border border-teal/30 bg-tealSoft px-4 font-semibold text-tealDeep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal" type="button" onClick={onAdd}>Add destination</button>
      </div>
      <ChipList label="Destinations" values={values} onChange={onChange} />
    </div>
  );
}

function ChipList({ label, values, onChange }: { label: string; values: string[]; onChange: (values: string[]) => void }) {
  if (values.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label={`${label} entries`}>
      {values.map((value, index) => (
        <li className="inline-flex max-w-full items-center gap-2 rounded-full border border-charcoal/10 bg-paper px-3 py-1.5 font-semibold" key={`${value}-${index}`}>
          <span className="min-w-0 break-words">{value}</span>
          <button aria-label={`Remove ${value}`} className="rounded-full p-1 text-charcoal/55 hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal" onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))} type="button">
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block max-w-2xl space-y-2 text-sm font-medium text-charcoal"><span>{label}</span><input aria-label={label} className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal focus:ring-2 focus:ring-teal/20" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-2 text-sm font-medium text-charcoal"><span>{label}</span><input aria-label={label} className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal focus:ring-2 focus:ring-teal/20" type="date" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function addMultiValueEntry(values: string[], draft: string) {
  const nextValue = draft.trim();
  if (!nextValue) return values;
  const normalised = nextValue.replace(/\s+/g, " ").toLocaleLowerCase();
  return values.some(
    (value) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase() === normalised,
  ) ? values : [...values, nextValue];
}
