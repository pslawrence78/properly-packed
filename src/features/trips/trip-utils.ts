import type { TripInput } from "../../db/repositories/trips-repository";
import type { TripStatus, TripType } from "../../db/types";

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

export function splitCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinCommaList(value: string[]) {
  return value.join(", ");
}

export function validateTrip(values: TripFormValues) {
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
    errors.push("At least one traveller is required.");
  }

  return errors;
}
