import Dexie, { type Table } from "dexie";
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
export const DATABASE_VERSION = 2;

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

    this.version(DATABASE_VERSION).stores({
      travellers: "id, name, travellerType, seedKey",
      trips: "id, status, startDate, tripType",
      tripItineraryDays: "id, tripId, dayNumber, &[tripId+dayNumber], date",
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
    });
  }
}

export const appDb = new ProperlyPackedDatabase();
