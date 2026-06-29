# Tranche 35B: Packing List Scroll Position and Action Audit v0.1

## What changed

This tranche fixes the live packing-list usability defect where routine in-place actions could kick the screen back through a full reload path and make the viewport feel like it had jumped to the top.

The packing screen now keeps a local item list in sync for routine mutations:

- mark packed / mark not taking
- change item status
- quick add
- detailed add
- bulk add
- edit item
- archive item

The screen no longer invalidates the whole packing dataset after each of those actions, which keeps the rendered list tree stable and avoids the loading-state swap that was causing the scroll disruption.

## Audit table

| Screen / component | Action / button | Current behaviour | Likely cause | Justified or defect | Fix applied or reason left unchanged |
| --- | --- | --- | --- | --- | --- |
| `PackingListScreen` row controls | Mark packed / mark not taking / status change | Updates the item locally without reloading the packing dataset | Previous `refreshKey` pattern forced `useAsyncData` back through a loading state after each mutation | Defect | Reworked to update local packing item state in place and keep the list mounted |
| `PackingListScreen` quick add | Add | Adds the new item locally and keeps the screen on the same view | Same refresh/reload cycle as the row actions | Defect | Reworked quick add to append locally instead of triggering a full dataset refresh |
| `PackingListScreen` detailed add | Add item | Adds the new item locally and closes the form | Same refresh/reload cycle as the row actions | Defect | Reworked detailed add to append locally instead of triggering a full dataset refresh |
| `PackingListScreen` bulk add | Add N items | Commits the selected rows and updates the existing list in place | Same refresh/reload cycle as the row actions | Defect | Reworked bulk add to append locally instead of triggering a full dataset refresh |
| `PackingListScreen` filters / Pack view switcher | Filter chips, selects, view mode buttons | Preserves local filter and grouping state | These are local state and query-param updates, not page navigations | Justified | Left unchanged |
| `PackingListScreen` top links | Trip overview / Review suggestions | Navigates to another screen | Intentional route change | Justified | Left unchanged |
| `AppStatusBanners` / `AppRecoveryBoundary` | Update app / Reload app | Intentionally reloads the app shell | Service-worker update activation or recovery from a render error | Justified | Left unchanged |
| Bags, Outfits, Gadgets, Library, Review, Templates, Settings screens | Local edit / action controls | Reviewed for the same reload-and-scroll pattern | These screens still use the established local-first refresh pattern, but no additional confirmed scroll-reset regression was demonstrated in this tranche | Not changed in this pass | Left unchanged pending a screen-specific regression signal |

## Manual QA checklist

- [ ] Seed or create a trip with a long packing list.
- [ ] Open Pack and scroll well down the list.
- [ ] Mark multiple items packed.
- [ ] Mark one item not taking.
- [ ] Change at least one item status.
- [ ] Use Quick Add for a single item.
- [ ] Repeat those actions in filtered and grouped views.
- [ ] Verify the viewport does not jump back to the top for routine in-place actions.
- [ ] Repeat on a desktop browser viewport and an iPhone-sized viewport.

## Automated validation performed

Passed:

- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`

## Manual validation status

Manual browser/device validation was not completed in this pass.

## Version and cache invariants

- App/package/cache version: `0.32.2`
- IndexedDB version: unchanged at `5`
- Export schema: unchanged at `properly-packed-export-v2`
- Seed data/version: unchanged

## Known limitations

- The packing list still re-renders when filters or view mode change, which is expected because those controls intentionally change the visible subset of items.
- The audit includes other long-list screens as reviewed, but only the packing screen had a confirmed and fixed scroll-loss path in this tranche.

## Suggested commit message

`Fix packing list scroll loss during in-place actions`
