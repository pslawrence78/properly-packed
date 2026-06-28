# Tranche 33: Bulk Capture and Offline Enrichment v0.1

## What changed

- Added a Bulk add workflow on the Pack screen, available alongside Quick add in every Pack view.
- Added a multiline capture input, preview cards, editable row fields, duplicate defaults, explicit commit and success/error states.
- Added deterministic parser and enrichment utilities outside React so behaviour is unit-testable.
- Commits use the existing `createPackingItem` repository path, preserving validation and `source: manual`.

## Supported syntax

- Plain lines: `swim goggles`
- Owner prefixes: `Seb: swim goggles`, `Shared: passports`
- Quantities: `sandals x2`, `swim shorts x 3`
- Slash metadata: `power bank / to charge / Gadget bag`
- Leading action verbs: `buy sun cream`, `charge iPad`, `download films`, `wash swim shorts`, `decide evening shoes`

Slash metadata is resolved in this order: status, priority, bag, category. Unknown tokens are kept as unresolved notes and shown as warnings.

## Enrichment rules

- Owner matching uses active travellers, case-insensitive names, first-name aliases and `Shared` -> `Shared Family` where that traveller exists.
- Owner inference is limited to high-confidence family patterns such as Toniebox/Tonies/Jellycat/tablet headphones/swim goggles for Seb, camera/drone/memory card/power bank/gadget/USB-C cable for Phil, sandals/evening dress/hair straighteners/make-up for Beck, dog items for Albert, and key shared travel/admin items for Shared Family or shared ownership.
- Category inference maps common item patterns to existing categories only, including documents, electronics, health, entertainment, cruise extras, pet, clothing and travel-day.
- Status inference uses explicit slash status or leading action verbs.
- Priority inference marks only critical terms such as passports, medication, tickets, boarding passes, phone, wallet/purse and prescriptions as essential.
- Bag inference only uses explicit slash metadata or the active Quick add context.

## Duplicate behaviour

Likely duplicates use normalised item name + owner + category. Existing trip duplicates and duplicates within the pasted batch are shown in preview and default to skipped. The user can include them deliberately.

## Version and data changes

- App/package/cache version: `0.30.0`
- IndexedDB version: unchanged
- Export schema: unchanged
- Seed data/version: unchanged

## Validation performed

- `corepack pnpm typecheck` passed.
- `corepack pnpm test` passed: 184 tests across 49 files.
- `corepack pnpm build` passed.

## Manual test trip approach

Manual validation used a local browser IndexedDB fixture named `Tranche 33 Validation Cruise`, created only in the validation browser profile. It included Beck, Phil, Seb, Shared Family and Albert, plus Suitcase, Hand luggage, Gadget bag, Travel documents pouch, Cruise cabin and Car boot.

The tranche sample list was used and extended to 34 pasted lines. Preview parsed all 34 rows as ready. One row was excluded, one item name was corrected from `Toniebox` to `Toniebox and charger`, and 33 items were committed.

Validated manually:

- Pack opened with By Person selected by default.
- New items appeared in the Pack list after commit.
- By Person, By Category, By Bag and By Action all showed expected groups.
- Several new items were marked packed.
- Refresh preserved 33 packable items and 3 packed items.
- Import/Export showed 33 packing items, export schema v2, and reported `Backup export prepared successfully`.
- iPhone-sized viewport at 390 x 844 showed the Bulk Add input, summary and stacked preview controls with no horizontal overflow.

## Known limitations

- Bulk add does not create new travellers, bags or categories from unknown tokens.
- Quantity syntax is intentionally narrow and only supports trailing `xN` forms.
- Unknown slash metadata is preserved as a note rather than guessed.
- Category inference uses the current app categories; domain-specific names such as "photography" map to electronics unless a matching category exists.

## Suggested next tranche

Tranche 35 can add the local autocomplete corpus and richer suggestions without changing this deterministic capture/preview/commit flow.
