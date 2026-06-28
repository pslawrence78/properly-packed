# Tranche 35: Packing Autocomplete Knowledge Corpus v0.1

## What changed

Tranche 35 adds a local, deterministic packing autocomplete corpus and uses it in Quick Add and Bulk Add. The feature is static TypeScript data only: no runtime AI, network request, sync, backend, persisted corpus records, or database migration was added.

## Corpus structure

The corpus lives in `src/features/packing-items/autocomplete/`:

- `packing-autocomplete-types.ts` defines typed entries and resolved suggestion results.
- `packing-autocomplete-corpus.ts` contains the static corpus.
- `packing-autocomplete-utils.ts` handles normalisation and safe owner/category resolution.
- `packing-autocomplete-search.ts` performs deterministic local search.

Each entry can include a canonical name, aliases, category hint, owner hint, priority/status hints, trip/context hints, bag hints, notes, flags, and a `familySpecific` marker.

## Corpus size and coverage

The v0.1 corpus contains 180 curated entries. This is below the long-term 500 to 1,000 entry target, intentionally: this tranche favours useful, non-duplicative suggestions over padded data. The structure supports expansion without redesign.

Covered groups include:

- Documents and travel admin.
- Clothing.
- Toiletries, health and comfort.
- Technology and chargers.
- Photography and gadgets.
- Seb and child travel.
- Cruise.
- Beach and pool.
- Theme park and Disney-style trips.
- Cold-weather and Lapland-style trips.
- UK staycation and car travel.
- Albert and dog travel.
- Useful extras.

## Lawrence-family examples

Family-specific entries are marked with `familySpecific: true`. Included examples include Toniebox, Tonies, Jellycat, tablet headphones, swim goggles, cruise lanyards, magnetic hooks, AirTags, phone stand, power bank, drone batteries, drone controller, camera memory cards, Disney/theme park ponchos, Albert lead, Albert towel, Albert bowls, Albert dog bed, travel day snacks, downloaded films, iPad/tablet charger, and Seb bedtime comfort item.

## Search and ranking

Search is local, case-insensitive, accent-insensitive, and deterministic. It matches canonical names, aliases, and normalised tokens. Scoring favours exact matches, then canonical prefix matches, alias prefix matches, token prefix matches, contains matches, trip/context relevance, and a small family-specific relevance nudge. Results are capped to 8 by default.

Existing duplicate-looking suggestions are not hidden. They remain visible with an existing-item hint and are de-prioritised.

## Quick Add behaviour

Quick Add now shows suggestions after at least 2 typed characters. Selecting a suggestion fills the item name and pre-fills safe owner, category, status, and priority hints. The user can override those fields before pressing Add. Active context defaults, such as adding inside Seb's group or a filtered category/status, remain higher priority than corpus hints.

Custom typed items still work normally and are not required to match the corpus. No item is created until the existing Add action is confirmed.

## Bulk Add enrichment

Bulk Add enrichment now uses close corpus matches to improve category, owner, priority, and status hints. Explicit user syntax still wins:

- `Phil: Toniebox` remains assigned to Phil.
- `sun cream / to buy` keeps the explicit `to-buy` status.
- Active Quick Add context remains respected.
- Unknown slash metadata continues to produce notes/warnings.

Corpus hints only resolve to existing travellers and categories. No owner, bag, or category records are auto-created.

## Version and data changes

- App/package/cache version: `0.32.0`.
- IndexedDB version: unchanged at `5`.
- Export schema: unchanged at `properly-packed-export-v2`.
- Seed data/version: unchanged.

## Validation performed

Passed:

- `corepack pnpm typecheck`
- `corepack pnpm test`: 224 tests across 51 files.
- `corepack pnpm build`

New/updated coverage includes corpus validation, required family-specific examples, search ranking and caps, duplicate suggestion handling, Quick Add selection and overrides, Quick Add context precedence, custom Quick Add items, and Bulk Add corpus enrichment with explicit syntax precedence.

## Manual validation outcome

Manual browser validation was not run in this pass. Automated component and integration tests cover the requested Quick Add, Bulk Add, duplicate, version, import/export, and Pack regression paths. A future browser pass should exercise the full realistic-trip checklist at mobile size.

## Known limitations

- The v0.1 corpus has 180 entries rather than the eventual 500 to 1,000 target.
- Quick Add suggestion details are intentionally lightweight and only appear after selecting a suggestion.
- Corpus bag hints are stored for future use but are not yet resolved into bag IDs.

## Suggested next tranche

Expand the corpus toward 500 to 1,000 entries using the same typed structure, add trip-type/context-aware boosting in the live Pack screen once trip context is passed through, and consider resolving safe bag hints where obvious bag names already exist.
