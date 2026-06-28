# Tranche 34: Real Trip Flow Hardening v0.1

## What changed

- Added active-trip resolution that treats missing, archived and completed active trips as recoverable states and clears stale active-trip pointers.
- Let `/pack` recover through the current active trip when no trip ID is supplied.
- Improved Dashboard recovery copy so stale active-trip states explain what happened and point to Trips or Create Trip.
- Hardened Pack filter state by dropping stale owner, bag and category query context after data loads.
- Reset Quick Add group context when switching Pack view modes so new items do not inherit a stale group.
- Reconciled active-trip settings after full import/restore so restored data cannot leave the app pointing at a non-existent or inactive active trip.
- Bumped app/package/cache version to `0.31.0`.

## Realistic scenarios covered

Regression fixtures now cover:

- `beachHolidayFixture`
- `flyCruiseFixture`
- `staycationWithAlbertFixture`
- `themeParkFixture`
- `coldWeatherFixture`

The fly-cruise fixture includes 30+ items, 5+ bags, 5+ categories, multiple action statuses, packed items, not-taking items, essentials, no-bag items, cruise-specific extras, gadget-style items and similar legitimate cable items.

## Fixture approach

Fixtures live in `src/test-utils/realistic-trip-fixtures.ts` and are test-only builders. They are not seed data and are not shipped as production demo trips.

## Active trip recovery behaviour

- Missing active trip ID: clears the stale setting and shows a recovery state.
- Archived active trip: clears the stale setting and shows a recovery state.
- Completed active trip: clears the stale setting and shows a recovery state.
- No active trip: Dashboard and Pack guide the user to select or create a trip.
- Deep links to missing trip IDs continue to show the safe Trip Not Found recovery state.
- `/pack` uses the resolved active trip when one exists.

## Readiness fixes and confirmations

- Confirmed `not-taking` items are excluded from packable progress and readiness blockers.
- Confirmed unpacked essentials prevent a Ready state.
- Confirmed action statuses remain visible through Dashboard counts and By Action groups.
- Confirmed no-bag items are surfaced in readiness and Pack filters.
- Confirmed archived items and archived bags are excluded from readiness calculations already covered by existing tests.
- Confirmed similar but separate items such as multiple USB-C cable variants are allowed in realistic fixtures.

## Mobile checks performed

- Pack grouped views retain the view switcher when filters produce no results in component coverage.
- Recovery states use existing responsive card patterns and include clear tap targets.
- Quick Add, Bulk Add entry and filter clear actions remain reachable in tested component flows.
- Manual in-app browser validation was attempted against the built app, but the browser client blocked local loopback URLs with `ERR_BLOCKED_BY_CLIENT`; `file://` validation is blocked by browser policy.

## Version and data changes

- App/package/cache version: `0.31.0`.
- IndexedDB version: unchanged.
- Export schema: unchanged.
- Seed data/version: unchanged.

## Validation performed

- `corepack pnpm typecheck`
- `corepack pnpm test`: 195 tests across 50 files
- `corepack pnpm build`
- Manual browser validation: attempted, blocked by local browser URL policy/client before the app loaded.

## Known limitations

- The tranche uses unit/component coverage and test-only realistic fixtures rather than a full browser automation flow for every scenario.
- Manual browser validation could not be completed in this session because the in-app browser refused local loopback and file URLs.
- Unknown travellers, bags and categories in Bulk Add remain warning-based and are not auto-created.
- Import/restore still performs full replacement only; merge import remains out of scope.

## Suggested next tranche

Tranche 35 should add the local autocomplete knowledge corpus while preserving the recovery and realistic fixture coverage added here.
