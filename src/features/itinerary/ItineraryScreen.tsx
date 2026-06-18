import { CalendarDays, Copy, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageSection } from "../../components/layout/PageSection";
import { ensureDatabaseReady } from "../../db";
import { listContextOptions } from "../../db/repositories/context-options-repository";
import {
  mergeUniqueContextValues,
  listItineraryDaysForTrip,
  saveItineraryDays,
  type TripItineraryDayUpdate,
} from "../../db/repositories/trip-itinerary-repository";
import { getTrip } from "../../db/repositories/trips-repository";
import type {
  ContextOption,
  ContextOptionType,
  Trip,
  TripItineraryDay,
} from "../../db/types";
import { useAsyncData } from "../../hooks/use-async-data";

type ContextKey =
  | "destinationContexts"
  | "climateContexts"
  | "accommodationContexts"
  | "transportContexts"
  | "activityContexts";

type ContextDefinition = {
  key: ContextKey;
  label: string;
  shortLabel: string;
};

type ItineraryDayState = TripItineraryDayUpdate & {
  date: string;
};

const contextDefinitions: ContextDefinition[] = [
  {
    key: "destinationContexts",
    label: "Destinations",
    shortLabel: "Dest.",
  },
  {
    key: "climateContexts",
    label: "Climate",
    shortLabel: "Climate",
  },
  {
    key: "accommodationContexts",
    label: "Accommodation",
    shortLabel: "Stay",
  },
  {
    key: "transportContexts",
    label: "Transport",
    shortLabel: "Travel",
  },
  {
    key: "activityContexts",
    label: "Activities",
    shortLabel: "Activity",
  },
];

export function ItineraryScreen() {
  const { tripId } = useParams();
  const itineraryData = useAsyncData(async () => {
    await ensureDatabaseReady();

    if (!tripId) {
      throw new Error("Trip not found.");
    }

    const [trip, contextOptions] = await Promise.all([
      getTrip(tripId),
      listContextOptions(),
    ]);

    if (!trip) {
      throw new Error("Trip not found.");
    }

    const itineraryDays = await listItineraryDaysForTrip(trip);

    return { contextOptions, itineraryDays, trip };
  }, [tripId]);

  return (
    <section className="space-y-5">
      {itineraryData.state === "loading" ? (
        <ItineraryStatus message="Loading itinerary..." />
      ) : null}
      {itineraryData.state === "error" ? (
        <ItineraryStatus message={itineraryData.error} />
      ) : null}
      {itineraryData.state === "ready" ? (
        <ItineraryEditor
          contextOptions={itineraryData.data.contextOptions}
          initialDays={itineraryData.data.itineraryDays}
          key={itineraryData.data.trip.id}
          trip={itineraryData.data.trip}
        />
      ) : null}
    </section>
  );
}

function ItineraryEditor({
  contextOptions,
  initialDays,
  trip,
}: {
  contextOptions: ContextOption[];
  initialDays: TripItineraryDay[];
  trip: Trip;
}) {
  const [days, setDays] = useState<ItineraryDayState[]>(() =>
    initialDays.map(toDayState),
  );
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const availableContextOptions = useMemo(
    () => ({
      destinationContexts: mergeUniqueContextValues(
        trip.destinations,
        days.flatMap((day) => day.destinationContexts),
      ),
      climateContexts: resolveContextLabels(
        trip.climateContextIds,
        "climate",
        contextOptions,
      ),
      accommodationContexts: resolveContextLabels(
        trip.accommodationContextIds,
        "accommodation",
        contextOptions,
      ),
      transportContexts: resolveContextLabels(
        trip.transportContextIds,
        "transport",
        contextOptions,
      ),
      activityContexts: resolveContextLabels(
        trip.activityContextIds,
        "activity",
        contextOptions,
      ),
    }),
    [contextOptions, days, trip],
  );

  const summary = useMemo(() => calculateItinerarySummary(days), [days]);

  function updateDay(dayNumber: number, updates: Partial<ItineraryDayState>) {
    setSaveState("idle");
    setDays((currentDays) =>
      currentDays.map((day) =>
        day.dayNumber === dayNumber ? { ...day, ...updates } : day,
      ),
    );
  }

  function toggleContext(dayNumber: number, key: ContextKey, value: string) {
    const day = days.find((currentDay) => currentDay.dayNumber === dayNumber);

    if (!day) {
      return;
    }

    const currentValues = day[key];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((currentValue) => currentValue !== value)
      : [...currentValues, value];

    updateDay(dayNumber, { [key]: nextValues } as Partial<ItineraryDayState>);
  }

  function copyPreviousDay(dayNumber: number) {
    const previousDay = days.find((day) => day.dayNumber === dayNumber - 1);

    if (!previousDay) {
      return;
    }

    updateDay(dayNumber, {
      destinationContexts: [...previousDay.destinationContexts],
      climateContexts: [...previousDay.climateContexts],
      accommodationContexts: [...previousDay.accommodationContexts],
      transportContexts: [...previousDay.transportContexts],
      activityContexts: [...previousDay.activityContexts],
    });
  }

  async function saveItinerary() {
    setSaveState("saving");

    try {
      const savedDays = await saveItineraryDays(trip, days);
      setDays(savedDays.map(toDayState));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <>
      <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
        <p className="inline-flex items-center gap-2 rounded-full bg-tealSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-tealDeep">
          <CalendarDays aria-hidden="true" className="h-4 w-4" />
          Itinerary
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
              {trip.name}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
              Map each trip day to the places, travel modes, stays, climate and
              activities that shape what needs packing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slateAccent px-4 py-3 text-sm font-semibold text-cream shadow-soft transition hover:bg-charcoal disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saveState === "saving"}
              onClick={saveItinerary}
              type="button"
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              {saveState === "saving" ? "Saving..." : "Save itinerary"}
            </button>
            <Link className="trip-action" to={`/trips/${trip.id}`}>
              Trip overview
            </Link>
            <Link className="trip-action" to={`/trips/${trip.id}/edit`}>
              Edit contexts
            </Link>
          </div>
        </div>
      </div>

      <PageSection title="Itinerary coverage">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Days" value={`${summary.dayCount}`} />
          <Metric label="With destinations" value={`${summary.destinationDays}`} />
          <Metric label="With climate" value={`${summary.climateDays}`} />
          <Metric label="With transport" value={`${summary.transportDays}`} />
          <Metric label="With stays" value={`${summary.accommodationDays}`} />
          <Metric label="With activities" value={`${summary.activityDays}`} />
        </div>
        {saveState === "saved" ? (
          <p className="mt-4 text-sm font-semibold text-tealDeep">
            Itinerary saved.
          </p>
        ) : null}
        {saveState === "error" ? (
          <p className="mt-4 text-sm font-semibold text-clay">
            Itinerary could not be saved. Please try again.
          </p>
        ) : null}
      </PageSection>

      <PageSection title="Day context matrix">
        <div className="hidden overflow-x-auto xl:block">
          <table className="min-w-[1120px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-56 rounded-l-lg bg-charcoal px-3 py-3 font-bold text-cream">
                  Day
                </th>
                {contextDefinitions.map((definition) => (
                  <th
                    className="bg-charcoal px-3 py-3 font-bold text-cream"
                    key={definition.key}
                  >
                    {definition.shortLabel}
                  </th>
                ))}
                <th className="w-64 rounded-r-lg bg-charcoal px-3 py-3 font-bold text-cream">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.dayNumber}>
                  <td className="sticky left-0 z-10 border-b border-charcoal/10 bg-paper px-3 py-4 align-top">
                    <DayHeader
                      day={day}
                      onCopyPrevious={() => copyPreviousDay(day.dayNumber)}
                      onTitleChange={(title) => updateDay(day.dayNumber, { title })}
                      showCopy={day.dayNumber > 1}
                    />
                  </td>
                  {contextDefinitions.map((definition) => (
                    <td
                      className="min-w-44 border-b border-charcoal/10 px-3 py-4 align-top"
                      key={definition.key}
                    >
                      <ContextOptions
                        label={definition.label}
                        options={availableContextOptions[definition.key]}
                        selectedValues={day[definition.key]}
                        onToggle={(value) =>
                          toggleContext(day.dayNumber, definition.key, value)
                        }
                      />
                    </td>
                  ))}
                  <td className="border-b border-charcoal/10 px-3 py-4 align-top">
                    <textarea
                      className="min-h-24 w-full rounded-lg border border-charcoal/15 bg-cream px-3 py-2 text-sm outline-none focus:border-teal"
                      value={day.notes ?? ""}
                      onChange={(event) =>
                        updateDay(day.dayNumber, { notes: event.target.value })
                      }
                      aria-label={`Day ${day.dayNumber} notes`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 xl:hidden">
          {days.map((day) => (
            <DayCard
              contextOptions={availableContextOptions}
              day={day}
              key={day.dayNumber}
              onCopyPrevious={() => copyPreviousDay(day.dayNumber)}
              onTitleChange={(title) => updateDay(day.dayNumber, { title })}
              onNotesChange={(notes) => updateDay(day.dayNumber, { notes })}
              onToggleContext={(key, value) =>
                toggleContext(day.dayNumber, key, value)
              }
            />
          ))}
        </div>
      </PageSection>
    </>
  );
}

function DayCard({
  contextOptions,
  day,
  onCopyPrevious,
  onNotesChange,
  onTitleChange,
  onToggleContext,
}: {
  contextOptions: Record<ContextKey, string[]>;
  day: ItineraryDayState;
  onCopyPrevious: () => void;
  onNotesChange: (notes: string) => void;
  onTitleChange: (title: string) => void;
  onToggleContext: (key: ContextKey, value: string) => void;
}) {
  return (
    <article className="rounded-lg border border-charcoal/10 bg-paper p-4 shadow-soft">
      <DayHeader
        day={day}
        onCopyPrevious={onCopyPrevious}
        onTitleChange={onTitleChange}
        showCopy={day.dayNumber > 1}
      />
      <div className="mt-4 grid gap-4">
        {contextDefinitions.map((definition) => (
          <ContextGroup
            definition={definition}
            key={definition.key}
            options={contextOptions[definition.key]}
            selectedValues={day[definition.key]}
            onToggle={(value) => onToggleContext(definition.key, value)}
          />
        ))}
        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Notes</span>
          <textarea
            className="min-h-24 w-full rounded-lg border border-charcoal/15 bg-cream px-3 py-2 text-sm outline-none focus:border-teal"
            value={day.notes ?? ""}
            onChange={(event) => onNotesChange(event.target.value)}
          />
        </label>
      </div>
    </article>
  );
}

function ContextGroup({
  definition,
  onToggle,
  options,
  selectedValues,
}: {
  definition: ContextDefinition;
  onToggle: (value: string) => void;
  options: string[];
  selectedValues: string[];
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-charcoal">
        {definition.label}
      </legend>
      <ContextOptions
        label={definition.label}
        options={options}
        selectedValues={selectedValues}
        onToggle={onToggle}
      />
    </fieldset>
  );
}

function ContextOptions({
  label,
  onToggle,
  options,
  selectedValues,
}: {
  label: string;
  onToggle: (value: string) => void;
  options: string[];
  selectedValues: string[];
}) {
  if (options.length === 0) {
    return (
      <p className="rounded-lg bg-cream px-3 py-2 text-xs font-medium text-charcoal/60">
        Add {label.toLowerCase()} on the trip first.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2" aria-label={label}>
      {options.map((option) => {
        const selected = selectedValues.includes(option);

        return (
          <button
            aria-pressed={selected}
            className={`max-w-full rounded-full border px-3 py-1.5 text-left text-xs font-semibold transition ${
              selected
                ? "border-teal bg-teal text-cream shadow-tactile"
                : "border-charcoal/10 bg-cream text-charcoal/75 hover:border-teal hover:bg-tealSoft"
            }`}
            key={option}
            onClick={() => onToggle(option)}
            type="button"
          >
            <span className="break-words">{option}</span>
          </button>
        );
      })}
    </div>
  );
}

function DayHeader({
  day,
  onCopyPrevious,
  onTitleChange,
  showCopy,
}: {
  day: ItineraryDayState;
  onCopyPrevious: () => void;
  onTitleChange: (title: string) => void;
  showCopy: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-base font-bold text-charcoal">Day {day.dayNumber}</p>
        <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/58">
          {formatTripDate(day.date)}
        </p>
      </div>
      <input
        className="min-h-10 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-sm outline-none focus:border-teal"
        value={day.title ?? ""}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Day title"
        aria-label={`Day ${day.dayNumber} title`}
      />
      {showCopy ? (
        <button
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-charcoal/10 bg-cream px-3 py-2 text-xs font-semibold text-charcoal/75 transition hover:border-teal hover:bg-tealSoft"
          onClick={onCopyPrevious}
          type="button"
        >
          <Copy aria-hidden="true" className="h-3.5 w-3.5" />
          Copy previous
        </button>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-cream p-4">
      <p className="text-sm font-medium text-charcoal/64">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-charcoal">{value}</p>
    </div>
  );
}

function ItineraryStatus({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 text-sm text-charcoal/70 shadow-soft">
      {message}
    </section>
  );
}

function toDayState(day: TripItineraryDay): ItineraryDayState {
  return {
    dayNumber: day.dayNumber,
    date: day.date,
    title: day.title ?? "",
    destinationContexts: [...day.destinationContexts],
    climateContexts: [...day.climateContexts],
    accommodationContexts: [...day.accommodationContexts],
    transportContexts: [...day.transportContexts],
    activityContexts: [...day.activityContexts],
    notes: day.notes ?? "",
  };
}

function calculateItinerarySummary(days: ItineraryDayState[]) {
  return {
    dayCount: days.length,
    destinationDays: days.filter((day) => day.destinationContexts.length > 0)
      .length,
    climateDays: days.filter((day) => day.climateContexts.length > 0).length,
    transportDays: days.filter((day) => day.transportContexts.length > 0).length,
    accommodationDays: days.filter(
      (day) => day.accommodationContexts.length > 0,
    ).length,
    activityDays: days.filter((day) => day.activityContexts.length > 0).length,
  };
}

export function resolveContextLabels(
  contextIds: string[] | undefined,
  expectedType: ContextOptionType,
  contextOptions: ContextOption[],
) {
  if (!Array.isArray(contextIds)) {
    return [];
  }

  const optionsById = new Map(
    contextOptions.map((option) => [option.id, option]),
  );

  return mergeUniqueContextValues(
    contextIds.map((id) => {
      const option = optionsById.get(id);
      return option?.type === expectedType ? option.label : "Unknown context";
    }),
  );
}

function formatTripDate(date: string) {
  const timestamp = Date.parse(`${date}T00:00:00Z`);

  if (Number.isNaN(timestamp)) {
    return date;
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(timestamp));
}
