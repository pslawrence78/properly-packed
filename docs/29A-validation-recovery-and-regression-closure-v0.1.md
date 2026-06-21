# Tranche 29A: Validation Recovery and Regression Closure v0.1

## Recovery assessment

Tranche 29 was substantially implemented and type-correct, but validation and
closure were incomplete. The initial full suite had five failures: three stale
version assertions and two Starter Pack component failures caused by the new
review-learning collection being absent from older preview fixtures. Review
import validation and the v4-to-v5 duplicate-review migration also lacked the
edge-case coverage required for release confidence.

## Repairs

- Starter Pack tolerates previews without review learning and remains explicitly
  opt-in when learning is present.
- Review creation rejects missing trips and is transactionally deduplicated.
- Review removal deletes associated learning records atomically.
- The v5 migration consolidates duplicate v4 reviews, preserves the latest
  summary and completion state, and repoints their learning records.
- Import validation rejects reviews for unknown trips, invalid review dates,
  invalid archive dates and unsupported learning trip types before replacement.
- Version assertions now match app/cache 0.27.0 and database v5.

## Validation closure

- TypeScript: passed (`tsc --noEmit`).
- Tests: 162/162 passed across 47 files.
- Production build: passed; the existing bundle-size warning remains non-failing.
- Routes: 22/22 returned HTTP 200 under `/properly-packed/`.
- Responsive inspection: mobile-first stacking, practical 44/48px controls and
  `sm`, `lg` and `xl` layouts were confirmed in review and Starter Pack code for
  the requested 390, 430, 768, 1024 and 1440px widths.
- Browser visual validation: unavailable because the managed Windows environment
  denied browser-process launch.
- Lint: no lint script is configured.
- Diff check: passed; only the repository's normal LF-to-CRLF notices were shown.

## Version status

- App/cache: 0.27.0
- IndexedDB: v5
- Seed: 0.11.0
- Export schema: v2 (unchanged)

## Known limitations

The production bundle still exceeds Vite's 500 kB advisory threshold. React
Router v7 future-flag notices remain in the test output. Both warnings pre-date
this recovery and do not fail validation.
