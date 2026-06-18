import type { TripInput } from "../../db/repositories/trips-repository";
import type { ContextOption, ContextOptionType, TripStatus, TripType } from "../../db/types";

export const tripTypeOptions: { value: TripType; label: string }[] = [
  { value: "beach-holiday", label: "Beach holiday" },
  { value: "city-break", label: "City break" },
  { value: "cruise", label: "Cruise" },
  { value: "fly-cruise", label: "Fly-cruise" },
  { value: "ex-uk-cruise", label: "Ex-UK cruise" },
  { value: "theme-park", label: "Theme park" },
  { value: "staycation", label: "Staycation" },
  { value: "short-break", label: "Short break" },
  { value: "cold-weather", label: "Cold weather" },
  { value: "special-occasion", label: "Special occasion" },
  { value: "multi-centre", label: "Multi-centre" },
  { value: "family-visit", label: "Family visit" },
];

export const tripStatusOptions: { value: TripStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "planning", label: "Planning" },
  { value: "packing", label: "Packing" },
  { value: "ready", label: "Ready" },
  { value: "travelling", label: "Travelling" },
  { value: "completed", label: "Completed" },
];

export type TripFormValues = Omit<TripInput, "nights">;

export function calculateTripNights(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return 0;
  }

  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }

  return Math.max(0, Math.round((end - start) / 86_400_000));
}

export function validateTrip(values: TripFormValues, contextOptions: ContextOption[] = []) {
  const errors: string[] = [];

  if (!values.name.trim()) {
    errors.push("Trip name is required.");
  }

  if (!values.startDate) {
    errors.push("Start date is required.");
  }

  if (!values.endDate) {
    errors.push("End date is required.");
  }

  if (values.startDate && values.endDate && values.endDate < values.startDate) {
    errors.push("End date cannot be before start date.");
  }

  if (values.travellerIds.length === 0) {
    errors.push("Select at least one traveller for this trip.");
  }

  if (contextOptions.length > 0) {
    const expectedTypes = [
      [values.climateContextIds, "climate"],
      [values.accommodationContextIds, "accommodation"],
      [values.transportContextIds, "transport"],
      [values.activityContextIds, "activity"],
    ] as [string[], ContextOptionType][];
    const byId = new Map(contextOptions.map((option) => [option.id, option]));
    if (expectedTypes.some(([ids, type]) => ids.some((id) => byId.get(id)?.type !== type))) {
      errors.push("One or more trip context selections are invalid.");
    }
  }

  return errors;
}
