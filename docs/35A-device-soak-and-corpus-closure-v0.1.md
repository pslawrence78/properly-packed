# Tranche 35A: Device Soak and Corpus Closure v0.1

## What changed

Tranche 35A closes the packing autocomplete corpus expansion with a deterministic, local-only data increase and adds the release notes needed for device soak validation. The change remains static TypeScript data and test coverage only:

- no runtime AI
- no backend work
- no database migration
- no export schema change
- no seed data change

The app version was bumped to `0.32.1`, and the service worker cache name was aligned with that release.

## Files changed

- `src/features/packing-items/autocomplete/packing-autocomplete-corpus.generated.ts`
- `src/features/packing-items/autocomplete/packing-autocomplete-corpus.ts`
- `src/tests/packing-autocomplete.test.ts`
- `src/tests/bulk-capture.test.ts`
- `src/tests/import-export-service.test.ts`
- `src/lib/app-version.ts`
- `public/sw.js`
- `package.json`
- `src/tests/App.test.tsx`
- `README.md`
- `docs/35A-device-soak-and-corpus-closure-v0.1.md`

## Corpus size and coverage

The autocomplete corpus now contains `600` total entries:

- `180` curated baseline entries
- `420` deterministic generated entries

The generated set is organised into 21 repeatable 5-by-4 grids, covering:

- clothing fabrics and fits
- occasionwear
- tops and outerwear
- swimwear
- shoes and accessories
- travel accessories
- dental, hair and beauty
- health and medicines
- charging and photography
- gadgets and connectivity
- kids play and kids tech
- travel documents and cruise extras
- dog travel items

This closes the corpus target for this tranche while keeping the suggestion set deterministic and testable.

## Manual QA checklist

### Quick Add

- [ ] Open Pack on a phone-sized viewport.
- [ ] Type 2 to 3 characters into Quick Add and confirm suggestions appear.
- [ ] Select a suggestion and confirm the canonical name fills in.
- [ ] Override the suggested owner, category, priority or status before saving.
- [ ] Confirm a custom typed item still saves normally when no suggestion is selected.
- [ ] Confirm active group context still wins over corpus hints.

### Bulk Add

- [ ] Paste a mixed list that includes clothing, travel tech, toiletries, cruise, beach and dog items.
- [ ] Confirm rows are parsed deterministically and previews show the expected enrichment.
- [ ] Confirm explicit user syntax still wins over corpus hints.
- [ ] Confirm duplicate bulk rows are still skipped or flagged in the preview.
- [ ] Confirm unknown metadata continues to warn rather than auto-create new records.

### Export / Import

- [ ] Create a few items via Quick Add and Bulk Add.
- [ ] Export the trip data.
- [ ] Import the exported file into a fresh local state.
- [ ] Confirm the restored items match by name and retain their expected trip metadata.
- [ ] Confirm the export/import flow still uses the existing schema version.

### iPhone Safari

- [ ] Open the built app in iPhone Safari.
- [ ] Confirm the Packing screen loads without layout breakage.
- [ ] Confirm Quick Add remains usable on a small touch viewport.
- [ ] Confirm Bulk Add is reachable and the preview remains readable.
- [ ] Confirm the settings screen still shows the app version.

### Installed PWA

- [ ] Install the app to the home screen.
- [ ] Launch from the installed icon.
- [ ] Confirm the app shell loads from the installed PWA entry point.
- [ ] Confirm the release cache updates after the version bump.
- [ ] Confirm offline-friendly shell assets still serve from the expected cache.

## Automated validation performed

Passed:

- `corepack pnpm test`
- `corepack pnpm typecheck`
- `corepack pnpm build`

The test suite passed with 51 files and 241 tests.

## Manual validation status

Manual browser/device soak was not run in this pass. The checklist above is the intended follow-up for phone-size Safari and installed-PWA verification.

## Version and data invariants

- App/package/cache version: `0.32.1`
- IndexedDB version: unchanged at `5`
- Export schema: unchanged at `properly-packed-export-v2`
- Seed data/version: unchanged

## Known limitations

- The corpus expansion is deliberately deterministic rather than AI-generated.
- The new generated entries are broad coverage scaffolding, so some names are intentionally repetitive and generic.
- Manual mobile validation still needs a real device or device emulator pass.

## Suggested commit message

`Tranche 35A: close corpus expansion and bump release to 0.32.1`
