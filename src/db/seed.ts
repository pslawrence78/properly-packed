import type { ProperlyPackedDatabase } from "./schema";
import { appDb } from "./schema";
import {
  createSeedSettings,
  seededGadgetBundleItems,
  seededGadgetBundles,
  seededTemplateItems,
  seededTemplates,
  seededTravellers,
  seededUsefulExtras,
  SEED_VERSION,
} from "./seed-data";
import type { AuditEvent, BaseEntity, Traveller } from "./types";

export type SeedResult = {
  applied: boolean;
  seedVersion: string;
  travellersInserted: number;
  templatesInserted: number;
  usefulExtrasInserted: number;
  gadgetBundlesInserted: number;
};

export async function applyInitialSeed(
  db: ProperlyPackedDatabase = appDb,
  nowFactory: () => string = () => new Date().toISOString(),
): Promise<SeedResult> {
  return db.transaction(
    "rw",
    [
      db.travellers,
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

      const seededTravellerCount = await db.travellers
        .where("seedKey")
        .startsWith("traveller:")
        .count();

      if (existingSeedVersion) {
        await db.templates.bulkPut(templates);
        await db.templateItems.bulkPut(templateItems);
        await db.usefulExtras.bulkPut(usefulExtras);
        await db.gadgetBundles.bulkPut(gadgetBundles);
        await db.gadgetBundleItems.bulkPut(gadgetBundleItems);
        await db.appSettings.bulkPut(createSeedSettings(now));

        return {
          applied: false,
          seedVersion: SEED_VERSION,
          travellersInserted: 0,
          templatesInserted: templates.length,
          usefulExtrasInserted: usefulExtras.length,
          gadgetBundlesInserted: gadgetBundles.length,
        };
      }

      if (seededTravellerCount > 0) {
        await db.templates.bulkPut(templates);
        await db.templateItems.bulkPut(templateItems);
        await db.usefulExtras.bulkPut(usefulExtras);
        await db.gadgetBundles.bulkPut(gadgetBundles);
        await db.gadgetBundleItems.bulkPut(gadgetBundleItems);
        await db.appSettings.bulkPut(createSeedSettings(now));

        return {
          applied: false,
          seedVersion: SEED_VERSION,
          travellersInserted: 0,
          templatesInserted: templates.length,
          usefulExtrasInserted: usefulExtras.length,
          gadgetBundlesInserted: gadgetBundles.length,
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
      };
    },
  );
}

function withTimestamps<T extends BaseEntity>(entities: T[], now: string): T[] {
  return entities.map((entity) => ({
    ...entity,
    createdAt: now,
    updatedAt: now,
  }));
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }

  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
