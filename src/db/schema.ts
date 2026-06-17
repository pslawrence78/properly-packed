import Dexie, { type Table, type Transaction } from "dexie";
import type {
  AppSetting,
  AuditEvent,
  Bag,
  GadgetBundle,
  GadgetBundleItem,
  Outfit,
  OutfitItem,
  PackingItem,
  PostTripReview,
  PreTripTask,
  ReviewLearning,
  Template,
  TemplateItem,
  Traveller,
  UsefulExtra,
  Trip,
  TripItineraryDay,
} from "./types";

export const DATABASE_NAME = "properly-packed-db";
export const DATABASE_VERSION = 3;

const storesV1 = {
  travellers: "id, name, travellerType, seedKey",
  trips: "id, status, startDate, tripType",
  packingItems:
    "id, tripId, ownerTravellerId, responsibleTravellerId, category, status, priority, bagId, source, forgottenRisk",
  bags: "id, tripId, ownerTravellerId, bagType",
  outfits:
    "id, tripId, ownerTravellerId, outfitType, plannedForDate, plannedForDay, status",
  outfitItems: "id, outfitId, packingItemId, itemType, status",
  gadgetBundles: "id, ownerTravellerId, name",
  gadgetBundleItems: "id, bundleId, category, required",
  templates: "id, name, active",
  templateItems: "id, templateId, ownerType, category, priority",
  usefulExtras: "id, category, forgottenBefore, invaluableBefore",
  preTripTasks: "id, tripId, ownerTravellerId, taskType, status",
  postTripReviews: "id, tripId",
  reviewLearnings: "id, reviewId, learningType",
  appSettings: "key",
  auditEvents: "id, eventType, entityType, entityId, createdAt",
};

const storesV2 = {
  ...storesV1,
  tripItineraryDays: "id, tripId, dayNumber, &[tripId+dayNumber], date",
};

const storesV3 = {
  ...storesV2,
  packingItems:
    "id, tripId, ownershipScope, ownerTravellerId, responsibleTravellerId, category, status, priority, bagId, source, forgottenRisk",
};

export class ProperlyPackedDatabase extends Dexie {
  travellers!: Table<Traveller, string>;
  trips!: Table<Trip, string>;
  tripItineraryDays!: Table<TripItineraryDay, string>;
  packingItems!: Table<PackingItem, string>;
  bags!: Table<Bag, string>;
  outfits!: Table<Outfit, string>;
  outfitItems!: Table<OutfitItem, string>;
  gadgetBundles!: Table<GadgetBundle, string>;
  gadgetBundleItems!: Table<GadgetBundleItem, string>;
  templates!: Table<Template, string>;
  templateItems!: Table<TemplateItem, string>;
  usefulExtras!: Table<UsefulExtra, string>;
  preTripTasks!: Table<PreTripTask, string>;
  postTripReviews!: Table<PostTripReview, string>;
  reviewLearnings!: Table<ReviewLearning, string>;
  appSettings!: Table<AppSetting, string>;
  auditEvents!: Table<AuditEvent, string>;

  constructor(databaseName = DATABASE_NAME) {
    super(databaseName);

    this.version(1).stores(storesV1);
    this.version(2).stores(storesV2);
    this.version(DATABASE_VERSION).stores(storesV3).upgrade(migrateNeutralOwnership);
  }
}

export const appDb = new ProperlyPackedDatabase();

async function migrateNeutralOwnership(transaction: Transaction) {
  const now = new Date().toISOString();
  const travellersTable = transaction.table("travellers");
  const travellers = await travellersTable.toArray();
  const legacySharedTravellerIds = new Set(
    travellers
      .filter(
        (traveller) =>
          traveller.seedKey === "traveller:shared-family" ||
          traveller.travellerType === "shared" ||
          (traveller.name === "Shared Family" && traveller.seedKey),
      )
      .map((traveller) => traveller.id),
  );

  await transaction.table("packingItems").toCollection().modify((item) => {
    if (!item.ownershipScope) {
      if (item.ownerTravellerId && legacySharedTravellerIds.has(item.ownerTravellerId)) {
        item.ownershipScope = "shared";
        delete item.ownerTravellerId;
      } else if (item.ownerTravellerId) {
        item.ownershipScope = "traveller";
      } else {
        item.ownershipScope = "unassigned";
      }
    }

    if (item.ownershipScope !== "traveller") {
      delete item.ownerTravellerId;
    }

    item.updatedAt = item.updatedAt ?? now;
  });

  if (legacySharedTravellerIds.size === 0) {
    return;
  }

  await transaction.table("bags").toCollection().modify((bag) => {
    if (bag.ownerTravellerId && legacySharedTravellerIds.has(bag.ownerTravellerId)) {
      delete bag.ownerTravellerId;
      bag.updatedAt = now;
    }
  });

  await transaction.table("trips").toCollection().modify((trip) => {
    const travellerIds = Array.isArray(trip.travellerIds) ? trip.travellerIds : [];
    const nextTravellerIds = travellerIds.filter(
      (travellerId: string) => !legacySharedTravellerIds.has(travellerId),
    );

    if (nextTravellerIds.length !== travellerIds.length) {
      trip.travellerIds = nextTravellerIds;
      trip.updatedAt = now;
    }
  });

  await Promise.all(
    [...legacySharedTravellerIds].map((travellerId) =>
      travellersTable.delete(travellerId),
    ),
  );
}
