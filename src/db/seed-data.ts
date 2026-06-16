import { APP_VERSION } from "../lib/app-version";
import type {
  AppSetting,
  BagType,
  GadgetBundle,
  GadgetBundleItem,
  Template,
  TemplateConditionRule,
  TemplateItem,
  Traveller,
  UsefulExtra,
  TripType,
} from "./types";

export const SEED_VERSION = "0.8.0";

export const seededTravellers: Traveller[] = [
  {
    id: "seed:traveller:beck",
    seedKey: "traveller:beck",
    seedVersion: SEED_VERSION,
    name: "Beck",
    travellerType: "adult",
    defaultIncluded: true,
    icon: "shirt",
    colour: "#b46b54",
    notes: "Seeded family traveller.",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "seed:traveller:phil",
    seedKey: "traveller:phil",
    seedVersion: SEED_VERSION,
    name: "Phil",
    travellerType: "adult",
    defaultIncluded: true,
    icon: "cable",
    colour: "#477b73",
    notes: "Seeded family traveller.",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "seed:traveller:seb",
    seedKey: "traveller:seb",
    seedVersion: SEED_VERSION,
    name: "Seb",
    travellerType: "child",
    defaultIncluded: true,
    icon: "backpack",
    colour: "#d9a74f",
    notes: "Seeded family traveller.",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "seed:traveller:shared-family",
    seedKey: "traveller:shared-family",
    seedVersion: SEED_VERSION,
    name: "Shared Family",
    travellerType: "shared",
    defaultIncluded: true,
    icon: "luggage",
    colour: "#2f3a3d",
    notes: "Shared family-level packing responsibility.",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "seed:traveller:albert",
    seedKey: "traveller:albert",
    seedVersion: SEED_VERSION,
    name: "Albert",
    travellerType: "dog",
    defaultIncluded: false,
    icon: "paw-print",
    colour: "#7d6b5d",
    notes: "Seeded but excluded from trips by default.",
    createdAt: "",
    updatedAt: "",
  },
];

export const seededCategories = [
  "clothing",
  "toiletries",
  "documents",
  "electronics",
  "health",
  "comfort",
  "entertainment",
  "travel-day",
  "cruise-extras",
  "misc",
  "pet",
  "weather",
  "laundry",
];

export const seededBagTypes: BagType[] = [
  "suitcase",
  "cabin-bag",
  "backpack",
  "handbag",
  "pouch",
  "day-bag",
  "camera-bag",
  "car-storage",
  "worn",
  "buy-later",
];

export const seededTemplates: Template[] = [
  template("cruise", "Cruise", ["cruise", "ex-uk-cruise"], [
    "formal-night",
    "pool",
    "excursion",
  ]),
  template("fly-cruise", "Fly-cruise", ["fly-cruise"], [
    "flight",
    "formal-night",
    "pool",
  ]),
  template("beach-holiday", "Beach holiday", ["beach-holiday"], [
    "pool",
    "beach",
  ]),
  template("theme-park", "Disney or theme park", ["theme-park"], [
    "theme-park",
    "walking",
  ]),
  template("staycation", "Staycation", ["staycation"], ["car", "self-catering"]),
  template("cold-weather", "Cold weather", ["cold-weather"], ["cold", "walking"]),
  template("city-break", "City break", ["city-break"], ["walking", "sightseeing"]),
  template("weekend-break", "Weekend break", ["short-break"], ["weekend"]),
  template("dog-friendly-uk", "Dog-friendly UK stay", ["staycation", "short-break"], [
    "dog-friendly",
    "car",
  ]),
];

export const seededTemplateItems: TemplateItem[] = [
  templateItem("cruise:passport", "cruise", "Passports", "shared", "documents", "essential"),
  templateItem("cruise:cruise-docs", "cruise", "Cruise boarding documents", "shared", "documents", "essential"),
  templateItem("cruise:lanyards", "cruise", "Cruise card lanyards", "shared", "cruise-extras", "useful"),
  templateItem("cruise:magnetic-hooks", "cruise", "Magnetic cabin hooks", "shared", "cruise-extras", "useful"),
  templateItem("cruise:formal-outfit", "cruise", "Formal night outfit", "selected-adult", "clothing", "important", [
    includesRule("activityContexts", "formal-night"),
  ]),
  templateItem("cruise:swimwear", "cruise", "Swimwear", "selected-adult", "clothing", "important", [
    includesRule("activityContexts", "pool"),
  ]),
  templateItem("fly-cruise:flight-docs", "fly-cruise", "Flight booking references", "shared", "documents", "essential"),
  templateItem("fly-cruise:plane-comfort", "fly-cruise", "Plane comfort pouch", "shared", "comfort", "useful"),
  templateItem("fly-cruise:hand-luggage-clothes", "fly-cruise", "Hand luggage spare clothes", "selected-adult", "clothing", "important"),
  templateItem("beach:sunscreen", "beach-holiday", "Sunscreen", "shared", "health", "essential"),
  templateItem("beach:beach-bag", "beach-holiday", "Beach bag", "shared", "travel-day", "important"),
  templateItem("beach:swimwear", "beach-holiday", "Swimwear", "selected-adult", "clothing", "important"),
  templateItem("theme-park:ponchos", "theme-park", "Lightweight ponchos", "shared", "weather", "useful"),
  templateItem("theme-park:power-bank", "theme-park", "Power bank", "shared", "electronics", "important"),
  templateItem("theme-park:kids-entertainment", "theme-park", "Queue entertainment", "selected-child", "entertainment", "useful"),
  templateItem("staycation:food-bags", "staycation", "Reusable food bags", "shared", "misc", "useful"),
  templateItem("staycation:washing-tabs", "staycation", "Laundry tablets", "shared", "laundry", "useful"),
  templateItem("cold:thermal-layers", "cold-weather", "Thermal layers", "selected-adult", "clothing", "important"),
  templateItem("cold:gloves", "cold-weather", "Gloves", "selected-adult", "clothing", "important"),
  templateItem("city:day-bag", "city-break", "Small day bag", "shared", "travel-day", "important"),
  templateItem("city:walking-shoes", "city-break", "Comfortable walking shoes", "selected-adult", "clothing", "essential"),
  templateItem("weekend:overnight-toiletries", "weekend-break", "Overnight toiletries", "selected-adult", "toiletries", "important"),
  templateItem("weekend:chargers", "weekend-break", "Phone chargers", "shared", "electronics", "essential"),
  templateItem("dog:lead", "dog-friendly-uk", "Albert lead", "dog", "pet", "essential"),
  templateItem("dog:food", "dog-friendly-uk", "Albert food", "dog", "pet", "essential"),
  templateItem("dog:towels", "dog-friendly-uk", "Dog towels", "dog", "pet", "important"),
];

export const seededUsefulExtras: UsefulExtra[] = [
  usefulExtra("plane-comfort:eye-mask", "Eye mask", "comfort", ["fly-cruise", "city-break"], ["flight"]),
  usefulExtra("plane-comfort:empty-water-bottle", "Empty water bottle", "travel-day", ["fly-cruise", "city-break"], ["flight"], true),
  usefulExtra("cruise:cabin-night-light", "Cabin night light", "cruise-extras", ["cruise", "fly-cruise", "ex-uk-cruise"], ["cruise"]),
  usefulExtra("cruise:over-door-organiser", "Over-door organiser", "cruise-extras", ["cruise", "fly-cruise", "ex-uk-cruise"], ["cruise"]),
  usefulExtra("theme-park:cooling-towel", "Cooling towel", "comfort", ["theme-park", "beach-holiday"], ["theme-park", "hot"]),
  usefulExtra("hotel:travel-washing-line", "Travel washing line", "laundry", ["beach-holiday", "staycation"], ["hotel", "pool"]),
  usefulExtra("pool:waterproof-phone-pouch", "Waterproof phone pouch", "electronics", ["beach-holiday", "cruise", "fly-cruise"], ["pool", "beach"]),
  usefulExtra("photo:spare-memory-card", "Spare memory card", "electronics", ["cruise", "city-break", "theme-park"], ["photography"]),
  usefulExtra("gadgets:cable-ties", "Cable ties", "electronics", ["cruise", "fly-cruise", "staycation"], ["gadgets"]),
  usefulExtra("kids:headphones", "Kids headphones", "entertainment", ["fly-cruise", "theme-park", "staycation"], ["kids"]),
  usefulExtra("health:plasters", "Plasters", "health", ["cruise", "fly-cruise", "theme-park", "city-break"], ["walking"], true),
  usefulExtra("documents:insurance", "Travel insurance details", "documents", ["cruise", "fly-cruise", "city-break"], ["admin"], true),
  usefulExtra("weather:compact-umbrella", "Compact umbrella", "weather", ["city-break", "staycation", "short-break"], ["weather"]),
  usefulExtra("car:snack-box", "Car snack box", "travel-day", ["staycation", "short-break"], ["car"]),
  usefulExtra("dog:poo-bags", "Poo bags", "pet", ["staycation", "short-break"], ["dog-friendly"], true),
];

export const seededGadgetBundles: GadgetBundle[] = [
  gadgetBundle("iphone-travel-kit", "iPhone travel kit", ["cruise", "fly-cruise", "city-break", "theme-park"], ["phone", "travel-day"]),
  gadgetBundle("tablet-entertainment-kit", "Tablet entertainment kit", ["fly-cruise", "staycation", "short-break", "theme-park"], ["kids", "flight", "car"]),
  gadgetBundle("camera-kit", "Camera kit", ["cruise", "fly-cruise", "city-break", "theme-park"], ["photography"]),
  gadgetBundle("drone-kit", "Drone kit", ["staycation", "city-break"], ["photography", "outdoors"]),
  gadgetBundle("laptop-work-kit", "Laptop work kit", ["city-break", "family-visit", "short-break"], ["work"]),
  gadgetBundle("cruise-cabin-charging-kit", "Cruise cabin charging kit", ["cruise", "fly-cruise", "ex-uk-cruise"], ["cruise", "gadgets"]),
  gadgetBundle("theme-park-battery-kit", "Theme park battery kit", ["theme-park"], ["theme-park", "battery"]),
  gadgetBundle("travel-connectivity-kit", "Travel connectivity kit", ["cruise", "fly-cruise", "city-break", "staycation"], ["connectivity", "travel-day"]),
];

export const seededGadgetBundleItems: GadgetBundleItem[] = [
  gadgetBundleItem("iphone:phone", "iphone-travel-kit", "iPhone", true, "electronics", 1, ["device"], undefined, "pack"),
  gadgetBundleItem("iphone:charger", "iphone-travel-kit", "iPhone charger plug", true, "electronics", 1, ["charger"], "Needs iPhone charging cable.", "pack"),
  gadgetBundleItem("iphone:cable", "iphone-travel-kit", "iPhone charging cable", true, "electronics", 1, ["cable"], undefined, "pack"),
  gadgetBundleItem("iphone:power-bank", "iphone-travel-kit", "Power bank", false, "electronics", 1, ["battery"], "Needs charging cable.", "charge"),
  gadgetBundleItem("iphone:offline-maps", "iphone-travel-kit", "Offline maps", false, "electronics", 1, ["download"], undefined, "download"),

  gadgetBundleItem("tablet:tablet", "tablet-entertainment-kit", "Tablet", true, "electronics", 1, ["device"], undefined, "charge"),
  gadgetBundleItem("tablet:case", "tablet-entertainment-kit", "Tablet case", true, "electronics", 1, ["accessory"]),
  gadgetBundleItem("tablet:headphones", "tablet-entertainment-kit", "Tablet headphones", true, "electronics", 1, ["audio"]),
  gadgetBundleItem("tablet:charging-cable", "tablet-entertainment-kit", "Tablet charging cable", true, "electronics", 1, ["cable"]),
  gadgetBundleItem("tablet:download-shows", "tablet-entertainment-kit", "Downloaded shows", false, "entertainment", 1, ["download"], undefined, "download"),

  gadgetBundleItem("camera:camera", "camera-kit", "Camera body", true, "electronics", 1, ["device"], undefined, "charge"),
  gadgetBundleItem("camera:battery", "camera-kit", "Camera battery", true, "electronics", 2, ["battery"], "Needs camera charger.", "charge"),
  gadgetBundleItem("camera:charger", "camera-kit", "Camera battery charger", true, "electronics", 1, ["charger"]),
  gadgetBundleItem("camera:memory-card", "camera-kit", "Memory cards", true, "electronics", 2, ["storage"]),
  gadgetBundleItem("camera:lens-cloth", "camera-kit", "Lens cloth", false, "electronics", 1, ["cleaning"]),

  gadgetBundleItem("drone:drone", "drone-kit", "Drone", true, "electronics", 1, ["device"], undefined, "charge"),
  gadgetBundleItem("drone:batteries", "drone-kit", "Drone batteries", true, "electronics", 3, ["battery"], "Needs drone charger.", "charge"),
  gadgetBundleItem("drone:charger", "drone-kit", "Drone charger", true, "electronics", 1, ["charger"]),
  gadgetBundleItem("drone:propellers", "drone-kit", "Spare drone propellers", false, "electronics", 1, ["spare"]),
  gadgetBundleItem("drone:permit-check", "drone-kit", "Drone local rules check", true, "documents", 1, ["check"], undefined, "check"),

  gadgetBundleItem("laptop:laptop", "laptop-work-kit", "Laptop", true, "electronics", 1, ["device"], undefined, "charge"),
  gadgetBundleItem("laptop:charger", "laptop-work-kit", "Laptop charger", true, "electronics", 1, ["charger"]),
  gadgetBundleItem("laptop:mouse", "laptop-work-kit", "Travel mouse", false, "electronics", 1, ["accessory"]),
  gadgetBundleItem("laptop:vpn", "laptop-work-kit", "Offline work files", false, "electronics", 1, ["download"], undefined, "download"),

  gadgetBundleItem("cruise:usb-hub", "cruise-cabin-charging-kit", "USB charging hub", true, "electronics", 1, ["charger"]),
  gadgetBundleItem("cruise:long-cable", "cruise-cabin-charging-kit", "Long charging cable", true, "electronics", 2, ["cable"]),
  gadgetBundleItem("cruise:plug-adapter", "cruise-cabin-charging-kit", "Travel plug adapter", true, "electronics", 1, ["adapter"]),
  gadgetBundleItem("cruise:cable-ties", "cruise-cabin-charging-kit", "Cable ties", false, "electronics", 1, ["organisation"]),

  gadgetBundleItem("theme-park:power-bank", "theme-park-battery-kit", "Large power bank", true, "electronics", 1, ["battery"], "Needs USB-C cable.", "charge"),
  gadgetBundleItem("theme-park:usb-c", "theme-park-battery-kit", "USB-C cable", true, "electronics", 1, ["cable"]),
  gadgetBundleItem("theme-park:phone-lanyard", "theme-park-battery-kit", "Phone lanyard", false, "electronics", 1, ["accessory"]),

  gadgetBundleItem("connectivity:hotspot", "travel-connectivity-kit", "Mobile hotspot", false, "electronics", 1, ["device"], "Needs charging cable.", "charge"),
  gadgetBundleItem("connectivity:sim-tool", "travel-connectivity-kit", "SIM ejector tool", false, "electronics", 1, ["tool"]),
  gadgetBundleItem("connectivity:roaming-check", "travel-connectivity-kit", "Roaming plan check", true, "documents", 1, ["check"], undefined, "check"),
];

export function createSeedSettings(now: string): AppSetting[] {
  return [
    {
      key: "appVersion",
      value: APP_VERSION,
      createdAt: now,
      updatedAt: now,
    },
    {
      key: "seedVersion",
      value: SEED_VERSION,
      createdAt: now,
      updatedAt: now,
    },
    {
      key: "seededAt",
      value: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      key: "defaultCategories",
      value: seededCategories,
      createdAt: now,
      updatedAt: now,
    },
    {
      key: "defaultBagTypes",
      value: seededBagTypes,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function template(
  key: string,
  name: string,
  applicableTripTypes: Template["applicableTripTypes"],
  applicableContexts: string[],
): Template {
  return {
    id: `seed:template:${key}`,
    seedKey: `template:${key}`,
    seedVersion: SEED_VERSION,
    name,
    applicableTripTypes,
    applicableTravellers: ["adult", "child", "dog", "shared"],
    applicableContexts,
    active: true,
    description: `${name} starter suggestions.`,
    createdAt: "",
    updatedAt: "",
  };
}

function templateItem(
  key: string,
  templateKey: string,
  name: string,
  ownerType: TemplateItem["ownerType"],
  category: string,
  priority: TemplateItem["priority"],
  conditionRules: TemplateConditionRule[] = [],
): TemplateItem {
  return {
    id: `seed:template-item:${key}`,
    seedKey: `template-item:${key}`,
    seedVersion: SEED_VERSION,
    templateId: `seed:template:${templateKey}`,
    name,
    ownerType,
    category,
    quantity: 1,
    priority,
    flags: [],
    conditionRules,
    createdAt: "",
    updatedAt: "",
  };
}

function usefulExtra(
  key: string,
  name: string,
  category: string,
  applicableTripTypes: UsefulExtra["applicableTripTypes"],
  applicableContexts: string[],
  forgottenBefore = false,
): UsefulExtra {
  return {
    id: `seed:useful-extra:${key}`,
    seedKey: `useful-extra:${key}`,
    seedVersion: SEED_VERSION,
    name,
    category,
    applicableTripTypes,
    applicableContexts,
    defaultPriority: forgottenBefore ? "important" : "useful",
    alwaysSuggest: forgottenBefore,
    neverSuggest: false,
    forgottenBefore,
    invaluableBefore: false,
    createdAt: "",
    updatedAt: "",
  };
}

function includesRule(
  field: TemplateConditionRule["field"],
  value: string,
): TemplateConditionRule {
  return {
    field,
    operator: "includes",
    value,
  };
}

function gadgetBundle(
  key: string,
  name: string,
  applicableTripTypes: TripType[],
  applicableContexts: string[],
): GadgetBundle {
  return {
    id: `seed:gadget-bundle:${key}`,
    seedKey: `gadget-bundle:${key}`,
    seedVersion: SEED_VERSION,
    name,
    ownerTravellerId: "seed:traveller:phil",
    applicableTripTypes,
    applicableContexts,
    notes: `${name} starter bundle.`,
    createdAt: "",
    updatedAt: "",
  };
}

function gadgetBundleItem(
  key: string,
  bundleKey: string,
  name: string,
  required: boolean,
  category: string,
  quantity: number,
  flags: string[],
  dependencyNotes?: string,
  preTripTaskType?: GadgetBundleItem["preTripTaskType"],
): GadgetBundleItem {
  return {
    id: `seed:gadget-bundle-item:${key}`,
    seedKey: `gadget-bundle-item:${key}`,
    seedVersion: SEED_VERSION,
    bundleId: `seed:gadget-bundle:${bundleKey}`,
    name,
    category,
    required,
    quantity,
    flags,
    dependencyNotes,
    preTripTaskType,
    createdAt: "",
    updatedAt: "",
  };
}
