# Properly Packed

Family travel packing, without the forgotten bits.

## Current Release

Version 0.26.0 delivers Tranche 28: Trip Readiness Dashboard and Action Views.
The active trip dashboard now derives overall, essential, action, traveller and
bag readiness; reports open pre-trip tasks and items without bags; and links each
metric to a visible filtered packing-list view. Starter Pack suggestions appear
only when the list is empty or new suggestions remain. IndexedDB remains v4,
export schema remains v2 and seed version remains v0.11.0.

Dashboard deep links support owner, bag, status, priority, no-bag and outstanding
filters. Unknown status or priority query values are ignored safely, and active
filters can be cleared from the Pack screen.

Validation for Tranche 28: typecheck passed, 156 tests across 47 files passed,
the production build passed, and the configured route sweep returned HTTP 200
for all 22 routes. The existing non-failing bundle-size and React Router future
flag warnings remain.

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
