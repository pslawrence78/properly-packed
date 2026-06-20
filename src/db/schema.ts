import Dexie, { type Table, type Transaction } from "dexie";
import type {
  AppSetting,
  AuditEvent,
  Bag,
  ContextOption,
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
export const DATABASE_VERSION = 5;

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

const storesV4 = {
  ...storesV3,
  contextOptions: "id, type, label, active, sortOrder, seedKey, archivedAt",
};

const storesV5 = {
  ...storesV4,
  postTripReviews: "id, &tripId, status",
  reviewLearnings:
    "id, reviewId, sourceTripId, learningType, *appliesToTripTypes, archivedAt",
};

export class ProperlyPackedDatabase extends Dexie {
  travellers!: Table<Traveller, string>;
  contextOptions!: Table<ContextOption, string>;
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
    this.version(3).stores(storesV3).upgrade(migrateNeutralOwnership);
    this.version(4).stores(storesV4).upgrade(migrateTripContexts);
    this.version(DATABASE_VERSION).stores(storesV5).upgrade(migrateReviewRecords);
  }
}

async function migrateReviewRecords(transaction: Transaction) {
  const now = new Date().toISOString();
  const reviews = transaction.table("postTripReviews");
  const learnings = transaction.table("reviewLearnings");
  const reviewRows = await reviews.toArray();
  const tripIdByReviewId = new Map<string, string>();

  for (const review of reviewRows) {
    tripIdByReviewId.set(review.id, review.tripId);
    await reviews.update(review.id, {
      status: review.completedAt ? "completed" : "draft",
      updatedAt: review.updatedAt ?? now,
    });
  }

  await learnings.toCollection().modify((learning) => {
    learning.sourceTripId =
      learning.sourceTripId ?? tripIdByReviewId.get(learning.reviewId) ?? "";
    learning.appliesToTripTypes = Array.isArray(learning.appliesToTripTypes)
      ? learning.appliesToTripTypes
      : [];
    learning.updatedAt = learning.updatedAt ?? now;
  });
}

export const appDb = new ProperlyPackedDatabase();

async function migrateTripContexts(transaction: Transaction) {
  const now = new Date().toISOString();
  const contextOptionsTable = transaction.table("contextOptions");
  const optionsByTypeAndLabel = new Map<string, ContextOption>();

  for (const option of await contextOptionsTable.toArray()) {
    optionsByTypeAndLabel.set(contextKey(option.type, option.label), option);
  }

  const tripsTable = transaction.table("trips");
  for (const trip of await tripsTable.toArray()) {
    const climateContextIds = await migrateLabels(
      "climate",
      trip.climateContextIds,
      trip.climateProfile ? [trip.climateProfile] : [],
    );
    const accommodationContextIds = await migrateLabels(
      "accommodation",
      trip.accommodationContextIds,
      trip.accommodationTypes,
    );
    const transportContextIds = await migrateLabels(
      "transport",
      trip.transportContextIds,
      trip.transportModes,
    );
    const activityContextIds = await migrateLabels(
      "activity",
      trip.activityContextIds,
      trip.activityContexts,
    );
    await tripsTable.put({
      ...trip,
      climateContextIds,
      accommodationContextIds,
      transportContextIds,
      activityContextIds,
      updatedAt: now,
    });
  }

  async function migrateLabels(
    type: ContextOption["type"],
    existingIds: unknown,
    labels: unknown,
  ) {
    const nextIds = new Set(
      Array.isArray(existingIds)
        ? existingIds.filter((id): id is string => typeof id === "string")
        : [],
    );
    const sourceLabels = Array.isArray(labels)
      ? labels.filter((label): label is string => typeof label === "string")
      : [];

    for (const sourceLabel of sourceLabels) {
      const label = sourceLabel.trim().replace(/\s+/g, " ");
      if (!label) continue;
      const key = contextKey(type, label);
      let option = optionsByTypeAndLabel.get(key);
      if (!option) {
        option = {
          id: createMigrationId(),
          type,
          label,
          active: true,
          sortOrder: optionsByTypeAndLabel.size,
          createdAt: now,
          updatedAt: now,
        };
        await contextOptionsTable.add(option);
        optionsByTypeAndLabel.set(key, option);
      }
      nextIds.add(option.id);
    }
    return [...nextIds];
  }
}

function contextKey(type: ContextOption["type"], label: string) {
  return `${type}:${label.trim().replace(/\s+/g, " ").toLocaleLowerCase()}`;
}

function createMigrationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `context-option:${crypto.randomUUID()}`;
  }
  return `context-option:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

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
