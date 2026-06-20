import { getTripContextIds, normaliseContextLabel } from "./context-options";
import type { ContextOption, Trip } from "./types";

export function tripMatchesContext(
  trip: Trip,
  value: string,
  contextOptions: ContextOption[] = [],
) {
  const normalisedValue = normaliseContextLabel(value);
  const ids = getTripContextIds(trip);
  if (ids.includes(value)) return true;

  const selectedOptions = contextOptions.filter((option) => ids.includes(option.id));
  const valueSlug = normalisedValue.replace(/\s+/g, "-");
  if (
    selectedOptions.some(
      (option) => {
        const optionLabel = normaliseContextLabel(option.label);
        return (
        optionLabel === normalisedValue ||
        optionLabel.startsWith(`${normalisedValue} `) ||
        optionLabel.endsWith(` ${normalisedValue}`) ||
        option.seedKey?.endsWith(`:${valueSlug}`) ||
        option.seedKey?.endsWith(`-${valueSlug}`)
        );
      },
    )
  ) {
    return true;
  }

  const legacyValues = [
    ...(trip.activityContexts ?? []),
    ...(trip.accommodationTypes ?? []),
    ...(trip.transportModes ?? []),
    ...(trip.climateProfile ? [trip.climateProfile] : []),
  ];
  return legacyValues.some(
    (legacyValue) => normaliseContextLabel(legacyValue) === normalisedValue,
  );
}
