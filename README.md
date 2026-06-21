# Properly Packed

Family travel packing, without the forgotten bits.

## Current Release

Version 0.29.0 expands the deterministic library intelligence available at first
use. It now includes 11 richer trip templates, 140 curated Useful Extras and 19
gadget bundles, with context rules for flight, cruise, beach, theme park,
dog-friendly, cold-weather, multi-centre and special-occasion travel.

Gadget bundles distinguish required and optional items and use the existing
charge, download, check and pack task workflow. Historic family packing patterns
informed the expansion, while sensitive details and age-stale toddler defaults
remain deliberately excluded.

Tranche 29 post-trip review and learning remains included.
Completed trips can capture forgotten, unused, invaluable, wrong-bag,
buy-next-time, always-suggest and do-not-suggest learnings. Reviews remain
editable, preserve item and bag snapshots, and can explicitly promote learning
to Useful Extras or a selected template.

Matching positive learning appears as a separate, opt-in Starter Pack source.
Buy-next-time items are added with `to-buy` status, forgotten items retain their
risk flag, duplicate suggestions are skipped, and trip-type suppressions prevent
matching template suggestions from being blindly applied. No template, library,
or future trip is silently rewritten.

IndexedDB is v5 (review query indexes and a non-destructive review migration).
Export schema remains v2 because review tables were already part of that contract;
review rows retain their stricter import validation.

IndexedDB remains v5, export schema remains v2 and seed data is v0.12.0.
See `docs/31-library-intelligence-expansion-v0.1.md` for the expanded seed
strategy, source assumptions, deliberate exclusions and validation scope.

## GitHub Pages Deployment

Properly Packed is configured as a Vite project-site deployment under:

- GitHub Pages: `https://pslawrence78.github.io/properly-packed/`
- Friendly path, if DNS and GitHub Pages custom-domain routing are configured: `https://www.lawnetcloud.uk/properly-packed/`

The production base path is `/properly-packed/`. Vite development still runs at `/`.

### Repository Settings

In GitHub, set **Settings -> Pages -> Build and deployment -> Source** to **GitHub Actions**.

The workflow is `.github/workflows/deploy-github-pages.yml`. It runs:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

The deployment artifact is `dist`.

### Local Checks

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm preview
```

After preview starts, check:

- `http://localhost:4173/properly-packed/`
- `http://localhost:4173/properly-packed/trips`
- `http://localhost:4173/properly-packed/settings`
- `http://localhost:4173/properly-packed/library`

### Custom Domain Notes

Do not hard-code `www.lawnetcloud.uk` in the app. DNS can point the host to GitHub Pages, but it cannot point directly to a URL path. The `/properly-packed/` path must be served by the appropriate GitHub Pages project/user-site setup.

If `https://pslawrence78.github.io/properly-packed/` works but `https://www.lawnetcloud.uk/properly-packed/` does not, the remaining issue is DNS/custom-domain/GitHub Pages site ownership rather than the React/Vite build.

### Local Data Note

Properly Packed stores data in IndexedDB. Browser data is origin-specific, so localhost data is separate from GitHub Pages data, and `pslawrence78.github.io` data may be separate from `www.lawnetcloud.uk` data. Use JSON export/import to move data between origins.
