import { packingAutocompleteCorpus } from "./packing-autocomplete-corpus";
import type {
  PackingAutocompleteContext,
  PackingAutocompleteEntry,
  ResolvedPackingAutocompleteSuggestion,
} from "./packing-autocomplete-types";
import {
  findAutocompleteDuplicate,
  normaliseAutocompleteText,
  resolveAutocompleteCategory,
  resolveAutocompleteOwnership,
  tokeniseAutocompleteText,
} from "./packing-autocomplete-utils";

const DEFAULT_LIMIT = 8;
const MIN_QUERY_LENGTH = 2;

type IndexedEntry = {
  entry: PackingAutocompleteEntry;
  normalisedName: string;
  normalisedAliases: string[];
  tokens: string[];
};

const indexedCorpus: IndexedEntry[] = packingAutocompleteCorpus.map((entry) => {
  const normalisedName = normaliseAutocompleteText(entry.name);
  const normalisedAliases = entry.aliases.map(normaliseAutocompleteText);
  return {
    entry,
    normalisedName,
    normalisedAliases,
    tokens: [...new Set([
      ...tokeniseAutocompleteText(entry.name),
      ...entry.aliases.flatMap(tokeniseAutocompleteText),
    ])],
  };
});

export function searchPackingAutocomplete(
  query: string,
  context: PackingAutocompleteContext = {},
  limit = DEFAULT_LIMIT,
): ResolvedPackingAutocompleteSuggestion[] {
  const normalisedQuery = normaliseAutocompleteText(query);
  if (normalisedQuery.length < MIN_QUERY_LENGTH) return [];

  return indexedCorpus
    .map((indexed) => scoreEntry(indexed, normalisedQuery, context))
    .filter((suggestion): suggestion is ResolvedPackingAutocompleteSuggestion =>
      Boolean(suggestion),
    )
    .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
    .slice(0, limit);
}

export function findBestPackingAutocompleteMatch(
  name: string,
  context: PackingAutocompleteContext = {},
) {
  const normalisedName = normaliseAutocompleteText(name);
  if (!normalisedName) return undefined;
  return searchPackingAutocomplete(name, context, 1).find((suggestion) => {
    const entryName = normaliseAutocompleteText(suggestion.entry.name);
    const aliases = suggestion.entry.aliases.map(normaliseAutocompleteText);
    return (
      entryName === normalisedName ||
      aliases.includes(normalisedName) ||
      entryName.startsWith(normalisedName) ||
      normalisedName.startsWith(entryName)
    );
  });
}

function scoreEntry(
  indexed: IndexedEntry,
  query: string,
  context: PackingAutocompleteContext,
): ResolvedPackingAutocompleteSuggestion | undefined {
  let score = 0;
  let matchReason = "";

  if (indexed.normalisedName === query) {
    score = 1000;
    matchReason = "Exact name match";
  } else if (indexed.normalisedName.startsWith(query)) {
    score = 850;
    matchReason = "Name starts with query";
  } else if (indexed.normalisedAliases.some((alias) => alias === query)) {
    score = 820;
    matchReason = "Exact alias match";
  } else if (indexed.normalisedAliases.some((alias) => alias.startsWith(query))) {
    score = 780;
    matchReason = "Alias starts with query";
  } else if (indexed.tokens.some((token) => token.startsWith(query))) {
    score = 650;
    matchReason = "Word starts with query";
  } else if (indexed.normalisedName.includes(query)) {
    score = 460;
    matchReason = "Name contains query";
  } else if (indexed.normalisedAliases.some((alias) => alias.includes(query))) {
    score = 430;
    matchReason = "Alias contains query";
  } else {
    return undefined;
  }

  if (context.trip && indexed.entry.tripTypeHints?.includes(context.trip.tripType)) {
    score += 40;
  }
  const contextIds = new Set([
    ...(context.trip?.activityContextIds ?? []),
    ...(context.trip?.climateContextIds ?? []),
    ...(context.trip?.transportContextIds ?? []),
    ...(context.trip?.accommodationContextIds ?? []),
  ].map(normaliseAutocompleteText));
  if (
    indexed.entry.contextHints?.some((hint) =>
      contextIds.has(normaliseAutocompleteText(hint)),
    )
  ) {
    score += 25;
  }
  if (indexed.entry.familySpecific) score += 5;

  const resolvedCategory =
    context.quickAddContext?.category ??
    resolveAutocompleteCategory(indexed.entry, context.categories);
  const resolvedOwnership = resolveAutocompleteOwnership({
    entry: indexed.entry,
    quickAddContext: context.quickAddContext,
    travellers: context.travellers,
  });
  const duplicate = findAutocompleteDuplicate({
    category: resolvedCategory,
    entry: indexed.entry,
    existingItems: context.existingItems,
    ownership: resolvedOwnership,
  });

  return {
    entry: indexed.entry,
    matchReason,
    duplicate: Boolean(duplicate),
    duplicateReason: duplicate ? `Already in this trip as "${duplicate.name}".` : undefined,
    resolvedCategory,
    resolvedOwnership,
    score: duplicate ? score - 80 : score,
  };
}
