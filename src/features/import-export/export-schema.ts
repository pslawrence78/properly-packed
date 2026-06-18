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
  Trip,
  TripItineraryDay,
  UsefulExtra,
} from "../../db/types";

export const EXPORT_SCHEMA_VERSION = "properly-packed-export-v2";
export const SUPPORTED_EXPORT_SCHEMA_VERSIONS = [
  "properly-packed-export-v1",
  EXPORT_SCHEMA_VERSION,
] as const;
export type SupportedExportSchemaVersion =
  (typeof SUPPORTED_EXPORT_SCHEMA_VERSIONS)[number];

export const exportTableNames = [
  "travellers",
  "contextOptions",
  "trips",
  "tripItineraryDays",
  "packingItems",
  "bags",
  "outfits",
  "outfitItems",
  "gadgetBundles",
  "gadgetBundleItems",
  "templates",
  "templateItems",
  "usefulExtras",
  "preTripTasks",
  "postTripReviews",
  "reviewLearnings",
  "appSettings",
  "auditEvents",
] as const;

export type ExportTableName = (typeof exportTableNames)[number];

export type ExportTables = {
  travellers: Traveller[];
  contextOptions: ContextOption[];
  trips: Trip[];
  tripItineraryDays: TripItineraryDay[];
  packingItems: PackingItem[];
  bags: Bag[];
  outfits: Outfit[];
  outfitItems: OutfitItem[];
  gadgetBundles: GadgetBundle[];
  gadgetBundleItems: GadgetBundleItem[];
  templates: Template[];
  templateItems: TemplateItem[];
  usefulExtras: UsefulExtra[];
  preTripTasks: PreTripTask[];
  postTripReviews: PostTripReview[];
  reviewLearnings: ReviewLearning[];
  appSettings: AppSetting[];
  auditEvents: AuditEvent[];
};

export type ProperlyPackedExport = {
  schemaVersion: SupportedExportSchemaVersion;
  exportedAt: string;
  appVersion: string;
  databaseVersion: number;
  tables: ExportTables;
};

export type ImportPreview = {
  schemaVersion: string;
  exportedAt: string;
  appVersion: string;
  databaseVersion: number;
  supported: true;
  compatibilityMessage: string;
  counts: Record<ExportTableName, number>;
};
