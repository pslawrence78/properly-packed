# Tranche 32: Packing Experience Reset v0.1

## What changed

- Reset the Pack screen around fast grouped packing views: By Person, By Category, By Bag, By Action and Flat List.
- Made By Person the default Pack view, with Shared Family and Unknown or Unassigned groups when relevant.
- Added group headers with packed progress, outstanding counts, essential counts and action counts.
- Reworked packing rows so marking packed is the primary action, with edit, archive and not-taking still available.
- Added visible active filter chips and a clear-filters action that also clears route query parameters.
- Improved Quick Add so it can inherit safe context from filters or the current group, including owner, category, bag or obvious action status.

## Pack views

- By Person groups items by traveller ownership, shared family items and unassigned or unknown owner states.
- By Category groups by the existing item category field.
- By Bag groups by the existing bag assignment, including No bag assigned and Bag unavailable fallbacks.
- By Action surfaces existing status/action data plus derived needs such as essentials not packed, no bag assigned, forgotten risk and needed/outstanding. Items may appear in more than one action group because this is a working view over the same items.
- Flat List preserves a simple all-items view for users who prefer the ungrouped list.

## Data model and versions

- No IndexedDB schema change.
- No export schema change.
- No seed data change.
- App/cache version was already at `0.29.0` for this tranche and remains aligned across `package.json`, `APP_VERSION` and the service worker cache.

## Validation performed

- `corepack pnpm typecheck`
- `corepack pnpm test`

## Known limitations

- Manual browser route sweep and iPhone-sized visual QA were not performed in this pass.
- The selected Pack view is local React state for now; it is not persisted as a user preference.
- Action view intentionally duplicates items across derived groups where that helps active packing.

## Suggested next tranche

- Tranche 33: bulk capture and offline enrichment for faster multi-item entry, using these Pack view defaults as the landing context.
