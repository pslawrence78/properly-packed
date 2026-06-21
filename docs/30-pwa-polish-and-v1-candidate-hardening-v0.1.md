# Tranche 30: PWA Polish and v1 Candidate Hardening v0.1

## Objective

Make Properly Packed a credible local-first v1 candidate without expanding the
product into accounts, cloud sync, APIs, notifications or other new modules.

## Baseline recovery

The repository was validated before implementation. Dependency installation,
TypeScript, 140 automated tests across 44 files, and the production build all
passed. The baseline build emitted one non-failing warning for a 568 kB eager
JavaScript chunk. Git was not available on the session PATH, so repository status
could not be rechecked with the Git CLI.

## Summary of changes

- Updated app, package and service-worker cache metadata to 0.28.0 and labelled
  the release `v1.0 Candidate` in Settings.
- Preserved IndexedDB v5, export schema v2 and seed v0.11.0 because no persisted
  data contract changed.
- Changed service-worker installation to wait instead of activating over an open
  session. A global prompt lets the user apply a waiting update deliberately.
- Added global offline messaging while preserving IndexedDB as the only user-data
  store and Cache Storage as app-shell/static-asset storage.
- Added a top-level recovery boundary so an unexpected render error produces a
  useful reload/backup state instead of a blank screen.
- Added a keyboard skip link, route loading state, safe-area bottom padding and
  explicit confirmation before reopening a completed review.
- Split user-facing screens by route to reduce startup cost and make loading
  states honest on slower mobile devices.
- Expanded Settings metadata and local-first privacy/backup guidance.
- Extended PWA regression checks to prevent forced service-worker activation.

## Files changed

- `package.json`, `pnpm-lock.yaml`
- `public/sw.js`
- `src/lib/app-version.ts`
- `src/app/routes.tsx`, `src/app/AppShell.tsx`
- `src/components/app-shell/AppRecoveryBoundary.tsx`
- `src/components/app-shell/AppStatusBanners.tsx`
- `src/features/settings/SettingsScreen.tsx`
- `src/features/reviews/PostTripReviewScreen.tsx`
- `src/tests/App.test.tsx`, `src/tests/pwa-release.test.ts`
- `README.md`

## Version changes

- App/package/cache: 0.27.0 (package metadata previously 0.15.0) to 0.28.0
- Release label: v1.0 Candidate
- IndexedDB: unchanged at v5
- Export schema: unchanged at `properly-packed-export-v2`
- Seed: unchanged at v0.11.0

## Validation

- Baseline: install, typecheck, test and build passed.
- Post-change TypeScript typecheck passed.
- Post-change full suite passed: 44 test files and 140 tests.
- Post-change production build passed. Route splitting reduced the largest eager
  JavaScript chunk from 568 kB to 330 kB and removed the Vite chunk-size warning.
- PWA output inspection checks manifest, icons, scoped launch metadata, cache
  version and controlled update activation; all passed.

## Manual checks

The in-app browser could not launch because of the known Windows browser sandbox
`CreateProcessAsUserW` access failure, including one clean retry. Responsive
verification was therefore limited to code-level inspection of the 390, 430,
768, 1024 and 1440 breakpoints, safe-area use, wrapping, tap targets and generated
production assets. A real rendered sweep is still required on the dashboard,
trips, packing, review, Settings and import/export paths. Install/offline/update
behaviour also needs a final iPhone Safari and installed-PWA check.

## Known limitations

- Data remains device- and browser-origin-specific; users must export JSON to move
  or protect it.
- No background cloud backup, cross-device sync or merge import exists.
- The service worker can protect navigation only after one successful online load.
- A representative committed multi-trip v1 export fixture is still recommended;
  current round-trip tests construct comprehensive post-review data in isolation.
- Browser-native confirmation dialogs are intentionally retained for destructive
  actions; a unified accessible dialog system can follow after v1 if needed.

## Non-goals

No accounts, authentication, backend, cloud sync, push, weather, AI packing,
payments, app-store packaging, collaboration or major visual/schema redesign.

## v1 candidate status

Candidate pending real-device responsive/install/offline smoke testing. Automated
post-change validation is recorded in the completion response. No known critical
data-loss path is being accepted silently.

## Recommended next step

Run a short v1 release-candidate soak on an iPhone and one desktop browser using
an exported illustrative family fixture, then fix only release-blocking defects.
