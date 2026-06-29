# Properly Packed

Family travel packing, without the forgotten bits.

## Current Release

Version 0.32.2 closes the packing list scroll-position tranche. Routine in-place
packing actions now update the local list state directly so marking packed, not
taking, changing status or quick-adding no longer forces the list back through a
full reload. See `docs/35B-packing-list-scroll-position-and-action-audit-v0.1.md`
for the audit table, validation notes and any remaining limitations.

The app remains local-first and testable. IndexedDB stays at v5, the export
schema stays at v2 and the seed data stays at v0.12.0.

See `docs/35A-device-soak-and-corpus-closure-v0.1.md` for the validation
checklists, limitations and tranche closure notes.

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
