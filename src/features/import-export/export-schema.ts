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
  Trip,
  UsefulExtra,
} from "../../db/types";

export const EXPORT_SCHEMA_VERSION = "properly-packed-export-v1";

export const exportTableNames = [
  "travellers",
  "trips",
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
  trips: Trip[];
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
  schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  appVersion: string;
  databaseVersion: number;
  tables: ExportTables;
};

export type ImportPreview = {
  schemaVersion: string;
  exportedAt: string;
  appVersion: string;
  counts: Record<ExportTableName, number>;
};
