import { useMemo, useState, type FormEvent } from "react";
import type { TripInput } from "../../db/repositories/trips-repository";
import type { Traveller, Trip } from "../../db/types";
import {
  calculateTripNights,
  joinCommaList,
  splitCommaList,
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
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const nights = useMemo(
    () => calculateTripNights(values.startDate, values.endDate),
    [values.startDate, values.endDate],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateTrip(values);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setSaving(true);
    try {
      await onSubmit({
        ...values,
        climateProfile: values.climateProfile?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
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
        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Destinations</span>
          <input
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={joinCommaList(values.destinations)}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                destinations: splitCommaList(event.target.value),
              }))
            }
            placeholder="e.g. Southampton, Lisbon"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Climate profile</span>
          <input
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={values.climateProfile ?? ""}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                climateProfile: event.target.value,
              }))
            }
            placeholder="e.g. warm, mixed, cold"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Accommodation types</span>
          <input
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={joinCommaList(values.accommodationTypes)}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                accommodationTypes: splitCommaList(event.target.value),
              }))
            }
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Transport modes</span>
          <input
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={joinCommaList(values.transportModes)}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                transportModes: splitCommaList(event.target.value),
              }))
            }
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Activity contexts</span>
          <input
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={joinCommaList(values.activityContexts)}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                activityContexts: splitCommaList(event.target.value),
              }))
            }
          />
        </label>

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
