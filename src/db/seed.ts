import type { ProperlyPackedDatabase } from "./schema";
import type { Table } from "dexie";
import { appDb } from "./schema";
import {
  createSeedSettings,
  seededContextOptions,
  seededGadgetBundleItems,
  seededGadgetBundles,
  seededTemplateItems,
  seededTemplates,
  seededTravellers,
  seededUsefulExtras,
  SEED_VERSION,
} from "./seed-data";
import { normaliseContextLabel } from "./context-options";
import type { AuditEvent, BaseEntity, ContextOption, Traveller } from "./types";

export type SeedResult = {
  applied: boolean;
  seedVersion: string;
  travellersInserted: number;
  templatesInserted: number;
  usefulExtrasInserted: number;
  gadgetBundlesInserted: number;
  contextOptionsInserted: number;
};

export async function applyInitialSeed(
  db: ProperlyPackedDatabase = appDb,
  nowFactory: () => string = () => new Date().toISOString(),
): Promise<SeedResult> {
  return db.transaction(
    "rw",
    [
      db.travellers,
      db.contextOptions,
      db.templates,
      db.templateItems,
      db.usefulExtras,
      db.gadgetBundles,
      db.gadgetBundleItems,
      db.appSettings,
      db.auditEvents,
    ],
    async () => {
      const existingSeedVersion = await db.appSettings.get("seedVersion");
      const now = nowFactory();
      const templates = withTimestamps(seededTemplates, now);
      const templateItems = withTimestamps(seededTemplateItems, now);
      const usefulExtras = withTimestamps(seededUsefulExtras, now);
      const gadgetBundles = withTimestamps(seededGadgetBundles, now);
      const gadgetBundleItems = withTimestamps(seededGadgetBundleItems, now);
      const contextOptionsInserted = await applyContextOptionSeed(db, now);

      const seededTravellerCount = await db.travellers
        .where("seedKey")
        .startsWith("traveller:")
        .count();

      if (existingSeedVersion) {
        await putSeedRecordsPreservingUserChanges(db.templates, templates);
        await putSeedRecordsPreservingUserChanges(db.templateItems, templateItems);
        await putSeedRecordsPreservingUserChanges(db.usefulExtras, usefulExtras);
        await putSeedRecordsPreservingUserChanges(db.gadgetBundles, gadgetBundles);
        await putSeedRecordsPreservingUserChanges(db.gadgetBundleItems, gadgetBundleItems);
        await db.appSettings.bulkPut(createSeedSettings(now));

        return {
          applied: false,
          seedVersion: SEED_VERSION,
          travellersInserted: 0,
          templatesInserted: templates.length,
          usefulExtrasInserted: usefulExtras.length,
          gadgetBundlesInserted: gadgetBundles.length,
          contextOptionsInserted,
        };
      }

      if (seededTravellerCount > 0) {
        await putSeedRecordsPreservingUserChanges(db.templates, templates);
        await putSeedRecordsPreservingUserChanges(db.templateItems, templateItems);
        await putSeedRecordsPreservingUserChanges(db.usefulExtras, usefulExtras);
        await putSeedRecordsPreservingUserChanges(db.gadgetBundles, gadgetBundles);
        await putSeedRecordsPreservingUserChanges(db.gadgetBundleItems, gadgetBundleItems);
        await db.appSettings.bulkPut(createSeedSettings(now));

        return {
          applied: false,
          seedVersion: SEED_VERSION,
          travellersInserted: 0,
          templatesInserted: templates.length,
          usefulExtrasInserted: usefulExtras.length,
          gadgetBundlesInserted: gadgetBundles.length,
          contextOptionsInserted,
        };
      }

      const travellers = withTimestamps(seededTravellers, now);
      const auditEvent: AuditEvent = {
        id: createId("audit"),
        eventType: "seed.applied",
        entityType: "appSettings",
        message: "Initial seed data applied.",
        metadata: {
          seedVersion: SEED_VERSION,
          travellersInserted: travellers.length,
          contextOptionsInserted,
        },
        createdAt: now,
      };

      await db.travellers.bulkPut(travellers);
      await db.templates.bulkPut(templates);
      await db.templateItems.bulkPut(templateItems);
      await db.usefulExtras.bulkPut(usefulExtras);
      await db.gadgetBundles.bulkPut(gadgetBundles);
      await db.gadgetBundleItems.bulkPut(gadgetBundleItems);
      await db.appSettings.bulkPut(createSeedSettings(now));
      await db.auditEvents.add(auditEvent);

      return {
        applied: true,
        seedVersion: SEED_VERSION,
        travellersInserted: travellers.length,
        templatesInserted: templates.length,
        usefulExtrasInserted: usefulExtras.length,
        gadgetBundlesInserted: gadgetBundles.length,
        contextOptionsInserted,
      };
    },
  );
}

async function applyContextOptionSeed(
  db: ProperlyPackedDatabase,
  now: string,
) {
  const existing = await db.contextOptions.toArray();
  let inserted = 0;

  for (const seeded of seededContextOptions) {
    const bySeedKey = existing.find((option) => option.seedKey === seeded.seedKey);
    if (bySeedKey) continue;

    const byLabel = existing.find(
      (option) =>
        option.type === seeded.type &&
        normaliseContextLabel(option.label) === normaliseContextLabel(seeded.label),
    );
    if (byLabel) {
      await db.contextOptions.update(byLabel.id, {
        seedKey: seeded.seedKey,
        seedVersion: SEED_VERSION,
      });
      byLabel.seedKey = seeded.seedKey;
      continue;
    }

    const option: ContextOption = {
      ...seeded,
      createdAt: now,
      updatedAt: now,
    };
    await db.contextOptions.add(option);
    existing.push(option);
    inserted += 1;
  }

  return inserted;
}

function withTimestamps<T extends BaseEntity>(entities: T[], now: string): T[] {
  return entities.map((entity) => ({
    ...entity,
    createdAt: now,
    updatedAt: now,
  }));
}

async function putSeedRecordsPreservingUserChanges<T extends BaseEntity>(
  table: Table<T, string>,
  records: T[],
) {
  const safeRecords: T[] = [];
  for (const record of records) {
    const existing = await table.get(record.id);
    if (existing?.userModifiedAt) continue;
    safeRecords.push({
      ...record,
      createdAt: existing?.createdAt ?? record.createdAt,
    });
  }
  if (safeRecords.length > 0) await table.bulkPut(safeRecords);
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }

  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
