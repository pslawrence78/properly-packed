# Tranche 29: Post-Trip Review and Learning v0.1

## What changed

Completed and archived trips can be opened at `/trips/:tripId/review`. A review
stores an editable summary and explicit learning records for forgotten, unused,
invaluable, wrong-bag, buy-next-time, always-suggest and do-not-suggest outcomes.
Source item, category, owner, original bag and suggested bag snapshots are kept
where available, so historical learning remains understandable if source data is
later archived.

Learnings can be amended or removed from the active review. Completing a review
records its completion time; reopening keeps its content and returns it to draft.

## Learning actions

- Useful Extra promotion is confirmed, normalised and deduplicated.
- Always-suggest and do-not-suggest actions update a reusable suggestion record
  only after confirmation and record the action on the learning.
- Template promotion requires a selected active template and deduplicates by
  normalised item name. Templates are never rewritten automatically.
- Wrong-bag learning records the historical and suggested bag; it never moves the
  completed trip's packing item.

## Future-trip influence

Starter Pack shows matching positive learning under “Learnt from previous trips”.
Nothing is added until the user selects and applies it. Forgotten learning sets
`forgottenRisk`; buy-next-time learning creates a `to-buy` item. Matching
trip-type suppressions hide learning and skip template suggestions with the same
normalised name. Cross-source duplicate checks remain active.

## Data and compatibility

- App/cache version: 0.27.0
- IndexedDB: v5, with non-destructive review migration and indexes by trip,
  review, type, applicable trip type and archive state
- Export schema: v2 (unchanged; both review tables already existed)
- Seed version: v0.11.0 (unchanged)

Review import validation is atomic and rejects malformed reviews, malformed
learning types and learning rows whose review is absent. Historical packing item,
bag and traveller references remain tolerant because their names are snapshotted.

## Deliberate limits

Local-first only. No cloud sync, accounts, AI analysis, notifications, automatic
template rewriting, weather integration or multi-user collaboration.

## Validation

Validation recovery completed in Tranche 29A. TypeScript typecheck, all 162 tests
across 47 files, the production build and the 22-route production-base HTTP sweep
pass. Responsive behaviour was checked at code level; browser visual automation
was unavailable because the browser process could not launch in the managed
Windows environment.
