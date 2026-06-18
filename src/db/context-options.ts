import type { ContextOption, ContextOptionType, Trip } from "./types";

export const contextOptionTypes: ContextOptionType[] = [
  "climate",
  "accommodation",
  "transport",
  "activity",
];

export const contextTypeLabels: Record<ContextOptionType, string> = {
  climate: "Climate Profiles",
  accommodation: "Accommodation Types",
  transport: "Transport Modes",
  activity: "Activity Contexts",
};

export const tripContextFields: Record<
  ContextOptionType,
  keyof Pick<
    Trip,
    | "climateContextIds"
    | "accommodationContextIds"
    | "transportContextIds"
    | "activityContextIds"
  >
> = {
  climate: "climateContextIds",
  accommodation: "accommodationContextIds",
  transport: "transportContextIds",
  activity: "activityContextIds",
};

export function normaliseContextLabel(label: string) {
  return label.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function groupContextOptionsByType(options: ContextOption[]) {
  return contextOptionTypes.reduce<Record<ContextOptionType, ContextOption[]>>(
    (groups, type) => {
      groups[type] = options
        .filter((option) => option.type === type)
        .sort(
          (a, b) =>
            a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
        );
      return groups;
    },
    { climate: [], accommodation: [], transport: [], activity: [] },
  );
}

export function getContextLabelsByIds(
  options: ContextOption[],
  ids: string[],
) {
  const optionsById = new Map(options.map((option) => [option.id, option]));
  return ids.map((id) => optionsById.get(id)?.label ?? "Unknown context");
}

export function getTripContextIds(trip: Trip) {
  return [
    ...(trip.climateContextIds ?? []),
    ...(trip.accommodationContextIds ?? []),
    ...(trip.transportContextIds ?? []),
    ...(trip.activityContextIds ?? []),
  ];
}
