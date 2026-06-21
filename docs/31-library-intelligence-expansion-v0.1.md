# Tranche 31: Library Intelligence Expansion v0.1

## Closure summary

Tranche 31 expands Properly Packed's deterministic, local-first seed library so a
new trip starts with more useful context and less blank-page work. The release
contains 11 trip templates with 142 template items, 140 Useful Extras, and 19
gadget bundles with 120 bundle items.

The expanded coverage includes flight comfort and admin, cruise embarkation and
cabin organisation, beach and pool days, theme parks, city walking, UK
staycations, dog-friendly travel, cold weather, multi-centre travel, special
occasions, family entertainment, photography, charging, downloads, laundry,
home departure, and smart-home checks.

## Seed strategy

- Suggestions remain deterministic, source-tracked, and opt-in.
- Template conditions keep flight, cruise, formal, hot-weather, cold-weather,
  photography, dog, and activity-specific items within relevant trips.
- Gadget bundles distinguish required from optional items and use the existing
  charge, download, check, and pack task hooks.
- Existing seed IDs remain stable. New records use the established seed-key
  convention, and user-modified seeded records continue to be preserved.
- Regression coverage checks seed uniqueness, clean names, scenario relevance,
  and age-appropriate child suggestions.

## Source assumptions and exclusions

The historic Dubai 2022 and Cruise February 2023 lists were treated as evidence
of recurring travel patterns, not imported as user data or copied literally.
No document numbers, booking references, addresses, credentials, or sensitive
home labels were added.

Historic toddler-era items such as nappies, dummies, changing mats, swim
nappies, pushchair accessories, and toddler cutlery are deliberately excluded
from current child defaults. The current model has no explicit toddler context,
so those items remain deferred rather than being suggested unsafely.

## Versions and contracts

- App/cache version: 0.29.0
- Seed version: 0.12.0
- IndexedDB: unchanged at v5
- Export schema: unchanged at v2

No runtime AI, cloud service, account system, sync, external API, notification,
calendar integration, or schema migration was introduced.

## Validation

The tranche adds behavioural coverage for family fly-cruise, beach, theme park,
dog-friendly UK stay, and cold-weather scenarios, alongside seed-quality and
user-modification preservation checks. The standard validation commands are:

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Suggested commit: `Tranche 31: expand library intelligence seed data`
