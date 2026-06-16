export type ISODateString = string;

export type TravellerType = "adult" | "child" | "dog" | "shared";

export type TripStatus =
  | "draft"
  | "planning"
  | "packing"
  | "ready"
  | "travelling"
  | "completed"
  | "archived";

export type TripType =
  | "beach-holiday"
  | "city-break"
  | "cruise"
  | "fly-cruise"
  | "ex-uk-cruise"
  | "theme-park"
  | "staycation"
  | "short-break"
  | "cold-weather"
  | "special-occasion"
  | "multi-centre"
  | "family-visit";

export type PackingPriority =
  | "essential"
  | "important"
  | "useful"
  | "nice-to-have"
  | "luxury"
  | "consider-leaving";

export type PackingStatus =
  | "needed"
  | "to-buy"
  | "to-wash"
  | "to-charge"
  | "to-download"
  | "to-decide"
  | "ready"
  | "packed"
  | "hand-luggage"
  | "suitcase"
  | "not-taking"
  | "used"
  | "unused";

export type PackingItemSource =
  | "manual"
  | "template"
  | "useful-extra"
  | "gadget-bundle"
  | "outfit"
  | "post-trip-learning"
  | "duplicated-trip";

export type BagType =
  | "suitcase"
  | "cabin-bag"
  | "backpack"
  | "handbag"
  | "pouch"
  | "day-bag"
  | "camera-bag"
  | "car-storage"
  | "worn"
  | "buy-later";

export type OutfitType =
  | "day"
  | "evening"
  | "travel-day"
  | "pool"
  | "beach"
  | "formal-night"
  | "theme-park"
  | "cold-weather"
  | "special-occasion";

export type OutfitStatus =
  | "planned"
  | "partially-planned"
  | "still-deciding"
  | "packed"
  | "rewear-option"
  | "not-taking";

export type OutfitItemType =
  | "top"
  | "bottom"
  | "dress"
  | "outerwear"
  | "shoes"
  | "accessory"
  | "jewellery"
  | "bag"
  | "other";

export type PreTripTaskType =
  | "buy"
  | "wash"
  | "charge"
  | "download"
  | "decide"
  | "check"
  | "print"
  | "pack"
  | "book"
  | "confirm";

export type ReviewLearningType =
  | "forgotten"
  | "unused"
  | "invaluable"
  | "packed-in-wrong-bag"
  | "buy-for-next-time"
  | "do-not-suggest-again"
  | "always-suggest";

export type TemplateConditionRule = {
  field:
    | "tripType"
    | "activityContexts"
    | "transportModes"
    | "accommodationTypes"
    | "climateProfile"
    | "travellers";
  operator: "equals" | "includes" | "not-includes";
  value: string;
};

export type SettingValue = string | number | boolean | string[] | null;

export type BaseEntity = {
  id: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  seedKey?: string;
  seedVersion?: string;
  userModifiedAt?: ISODateString;
};

export type ArchivableEntity = BaseEntity & {
  archivedAt?: ISODateString;
};

export type Traveller = ArchivableEntity & {
  name: string;
  travellerType: TravellerType;
  defaultIncluded: boolean;
  icon?: string;
  colour?: string;
  notes?: string;
};

export type Trip = ArchivableEntity & {
  name: string;
  tripType: TripType;
  startDate: string;
  endDate: string;
  nights: number;
  destinations: string[];
  climateProfile?: string;
  accommodationTypes: string[];
  transportModes: string[];
  activityContexts: string[];
  travellerIds: string[];
  status: TripStatus;
  notes?: string;
};

export type PackingItem = ArchivableEntity & {
  tripId: string;
  libraryItemId?: string;
  name: string;
  ownerTravellerId: string;
  responsibleTravellerId?: string;
  category: string;
  quantity: number;
  priority: PackingPriority;
  status: PackingStatus;
  bagId?: string;
  flags: string[];
  dependencyItemIds: string[];
  source: PackingItemSource;
  sourceId?: string;
  notes?: string;
  forgottenRisk: boolean;
  alwaysSuggest?: boolean;
  neverSuggest?: boolean;
};

export type Bag = ArchivableEntity & {
  tripId: string;
  name: string;
  bagType: BagType;
  ownerTravellerId?: string;
  notes?: string;
  isHandLuggage: boolean;
  isTravelDay: boolean;
  isCruiseEmbarkation: boolean;
};

export type Outfit = BaseEntity & {
  tripId: string;
  ownerTravellerId: string;
  name: string;
  outfitType: OutfitType;
  plannedForDay?: number;
  plannedForDate?: string;
  activityContext?: string;
  status: OutfitStatus;
  rewearEligible: boolean;
  rewearCount?: number;
  notes?: string;
};

export type OutfitItem = BaseEntity & {
  outfitId: string;
  packingItemId?: string;
  name: string;
  itemType: OutfitItemType;
  status: "needed" | "packed" | "not-taking";
  notes?: string;
};

export type GadgetBundle = ArchivableEntity & {
  name: string;
  ownerTravellerId: string;
  applicableTripTypes: TripType[];
  applicableContexts: string[];
  notes?: string;
};

export type GadgetBundleItem = BaseEntity & {
  bundleId: string;
  name: string;
  category: string;
  required: boolean;
  quantity: number;
  flags: string[];
  dependencyNotes?: string;
  preTripTaskType?: "charge" | "download" | "check" | "pack";
  notes?: string;
};

export type Template = BaseEntity & {
  name: string;
  applicableTripTypes: TripType[];
  applicableTravellers: TravellerType[];
  applicableContexts: string[];
  description?: string;
  active: boolean;
};

export type TemplateItem = BaseEntity & {
  templateId: string;
  name: string;
  ownerType: TravellerType | "selected-adult" | "selected-child";
  category: string;
  quantity: number;
  priority: PackingPriority;
  flags: string[];
  notes?: string;
  conditionRules: TemplateConditionRule[];
};

export type UsefulExtra = ArchivableEntity & {
  name: string;
  category: string;
  applicableTripTypes: TripType[];
  applicableContexts: string[];
  defaultPriority: PackingPriority;
  notes?: string;
  alwaysSuggest: boolean;
  neverSuggest: boolean;
  forgottenBefore: boolean;
  invaluableBefore: boolean;
};

export type PreTripTask = BaseEntity & {
  tripId: string;
  relatedItemId?: string;
  relatedBundleId?: string;
  taskName: string;
  taskType: PreTripTaskType;
  ownerTravellerId?: string;
  status: "open" | "done" | "dismissed";
  dueTiming?: "early" | "week-before" | "day-before" | "travel-day";
  notes?: string;
};

export type PostTripReview = BaseEntity & {
  tripId: string;
  completedAt?: string;
  summary?: string;
};

export type ReviewLearning = BaseEntity & {
  reviewId: string;
  itemName: string;
  learningType: ReviewLearningType;
  appliesToTripTypes: TripType[];
  actionTaken?: string;
  notes?: string;
};

export type AppSetting = {
  key: string;
  value: SettingValue;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type AuditEvent = {
  id: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  message?: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: ISODateString;
};
