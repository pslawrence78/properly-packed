import type { Bag, PackingItem, Traveller, Trip } from "../db/types";

export type RealisticTripFixture = {
  bags: Bag[];
  items: PackingItem[];
  travellers: Traveller[];
  trip: Trip;
};

const now = "2026-06-28T00:00:00.000Z";

export const beachHolidayFixture = createFixture({
  id: "beach-holiday",
  tripType: "beach-holiday",
  name: "Beach holiday",
  contexts: {
    climateContextIds: ["fixture:context:hot-weather"],
    accommodationContextIds: ["fixture:context:hotel"],
    transportContextIds: ["fixture:context:flight"],
    activityContextIds: [
      "fixture:context:pool",
      "fixture:context:beach",
      "fixture:context:restaurants",
    ],
  },
  bags: [
    ["main", "Main suitcase", "suitcase"],
    ["cabin", "Cabin bag", "cabin-bag"],
    ["seb", "Seb backpack", "backpack"],
    ["toiletry", "Toiletry pouch", "pouch"],
    ["beach", "Beach bag", "day-bag"],
  ],
  itemSpecs: [
    ["Passports", "shared", "documents", "essential", "needed", "cabin", ["travel-day"]],
    ["Boarding passes", "shared", "documents", "essential", "to-download", "cabin", ["travel-day"]],
    ["Sun cream", "shared", "toiletries", "essential", "to-buy", "toiletry"],
    ["After sun", "shared", "toiletries", "important", "needed", "toiletry"],
    ["Swim goggles", "seb", "swim", "important", "needed", "beach"],
    ["Seb pool toys", "seb", "entertainment", "useful", "needed", "beach"],
    ["Beck evening outfit", "beck", "clothing", "important", "packed", "main"],
    ["Phil linen shirt", "phil", "clothing", "important", "needed", "main"],
    ["Power bank", "shared", "electronics", "important", "to-charge", "cabin"],
    ["Travel adapter", "shared", "electronics", "important", "packed", "cabin"],
    ["Plasters", "shared", "health", "useful", "needed", undefined],
    ["Spare beach towel", "shared", "swim", "nice-to-have", "not-taking", "beach"],
  ],
});

export const flyCruiseFixture = createFixture({
  id: "fly-cruise",
  tripType: "fly-cruise",
  name: "Fly-cruise",
  contexts: {
    climateContextIds: ["fixture:context:warm"],
    accommodationContextIds: ["fixture:context:cruise-cabin"],
    transportContextIds: ["fixture:context:flight"],
    activityContextIds: [
      "fixture:context:formal-nights",
      "fixture:context:excursions",
      "fixture:context:pool",
    ],
  },
  bags: [
    ["main", "Main suitcase", "suitcase"],
    ["beck", "Beck cabin bag", "cabin-bag"],
    ["phil", "Phil cabin bag", "cabin-bag"],
    ["seb", "Seb backpack", "backpack"],
    ["embark", "Embarkation bag", "day-bag"],
    ["gadget", "Gadget pouch", "pouch"],
  ],
  itemSpecs: [
    ["Passports", "shared", "documents", "essential", "needed", "beck", ["travel-day"]],
    ["Boarding passes", "shared", "documents", "essential", "to-download", "beck", ["travel-day"]],
    ["Cruise luggage labels", "shared", "documents", "essential", "to-buy", undefined, ["travel-day"]],
    ["Travel insurance", "shared", "documents", "essential", "packed", "beck"],
    ["Lanyards", "shared", "cruise", "important", "to-buy", "embark"],
    ["Magnetic hooks", "shared", "cruise", "useful", "needed", "main"],
    ["Medication", "shared", "health", "essential", "needed", "embark", ["travel-day"]],
    ["Seb tablet", "seb", "entertainment", "important", "to-charge", "seb", ["travel-day"]],
    ["Offline cartoons", "seb", "entertainment", "useful", "to-download", "seb"],
    ["Camera", "phil", "electronics", "important", "packed", "gadget"],
    ["Camera batteries", "phil", "electronics", "important", "to-charge", "gadget"],
    ["USB-C cable", "shared", "electronics", "important", "packed", "gadget"],
    ["USB-C cable for iPad", "shared", "electronics", "important", "needed", "gadget"],
    ["USB-C cable for power bank", "shared", "electronics", "important", "needed", "gadget"],
    ["Power bank", "shared", "electronics", "important", "to-charge", "gadget"],
    ["Formal dress", "beck", "clothing", "important", "needed", "main"],
    ["Formal shirt", "phil", "clothing", "important", "packed", "main"],
    ["Seb smart outfit", "seb", "clothing", "important", "needed", "main"],
    ["Swim shorts", "phil", "swim", "important", "packed", "main"],
    ["Swimsuit", "beck", "swim", "important", "packed", "main"],
    ["Seb swim kit", "seb", "swim", "important", "needed", "main"],
    ["Sunglasses", "shared", "accessories", "useful", "needed", "embark"],
    ["Reusable bottles", "shared", "health", "useful", "needed", "embark"],
    ["Embarkation snacks", "shared", "food", "useful", "to-buy", "embark"],
    ["Cruise app login", "shared", "admin", "important", "to-decide", undefined],
    ["Printed excursion tickets", "shared", "documents", "important", "needed", "beck"],
    ["Light rain jackets", "shared", "clothing", "useful", "needed", "main"],
    ["Sea bands", "shared", "health", "useful", "packed", "embark"],
    ["Spare memory card", "phil", "electronics", "useful", "to-buy", "gadget"],
    ["Old guidebook", "shared", "entertainment", "nice-to-have", "not-taking", "main"],
    ["Pyjamas", "beck", "clothing", "important", "needed", "main"],
    ["Flip flops", "seb", "footwear", "useful", "needed", "main"],
  ],
});

export const staycationWithAlbertFixture = createFixture({
  id: "staycation-albert",
  tripType: "staycation",
  name: "UK staycation with Albert",
  includeAlbert: true,
  contexts: {
    climateContextIds: ["fixture:context:rain-possible"],
    accommodationContextIds: ["fixture:context:self-catering"],
    transportContextIds: ["fixture:context:car"],
    activityContextIds: ["fixture:context:dog-friendly"],
  },
  bags: [
    ["boot", "Car boot", "car-storage"],
    ["dog", "Albert bag", "day-bag"],
    ["main", "Family holdall", "suitcase"],
    ["food", "Food crate", "car-storage"],
    ["tech", "Tech pouch", "pouch"],
  ],
  itemSpecs: [
    ["Albert lead", "albert", "dog", "essential", "packed", "dog"],
    ["Dog towel", "albert", "dog", "important", "needed", "dog"],
    ["Dog bowls", "albert", "dog", "essential", "needed", "food"],
    ["Dog bed", "albert", "dog", "important", "needed", "boot"],
    ["Waterproof coats", "shared", "clothing", "important", "needed", "main"],
    ["Car snacks", "shared", "food", "useful", "to-buy", "food"],
    ["Chargers", "shared", "electronics", "important", "to-charge", "tech"],
    ["Board games", "shared", "entertainment", "useful", "packed", "boot"],
    ["Food basics", "shared", "food", "important", "needed", "food"],
    ["Old dog toy", "albert", "dog", "nice-to-have", "not-taking", "dog"],
  ],
});

export const themeParkFixture = createFixture({
  id: "theme-park",
  tripType: "theme-park",
  name: "Theme park trip",
  contexts: {
    climateContextIds: ["fixture:context:mixed-weather"],
    accommodationContextIds: ["fixture:context:hotel"],
    transportContextIds: ["fixture:context:car"],
    activityContextIds: ["fixture:context:walking", "fixture:context:photography"],
  },
  bags: [
    ["day", "Park day bag", "day-bag"],
    ["camera", "Camera bag", "camera-bag"],
    ["main", "Overnight bag", "suitcase"],
    ["snack", "Snack pouch", "pouch"],
    ["car", "Car boot", "car-storage"],
  ],
  itemSpecs: [
    ["Comfortable shoes", "shared", "footwear", "essential", "needed", "main"],
    ["Ponchos", "shared", "clothing", "important", "to-buy", "day"],
    ["Caps", "shared", "accessories", "useful", "needed", "day"],
    ["Refillable bottles", "shared", "health", "important", "packed", "day"],
    ["Snacks", "shared", "food", "useful", "to-buy", "snack"],
    ["Power banks", "shared", "electronics", "important", "to-charge", "camera"],
    ["Camera", "phil", "electronics", "useful", "packed", "camera"],
    ["Seb queue entertainment", "seb", "entertainment", "useful", "needed", "day"],
    ["Old autograph book", "seb", "entertainment", "nice-to-have", "not-taking", "day"],
  ],
});

export const coldWeatherFixture = createFixture({
  id: "cold-weather",
  tripType: "cold-weather",
  name: "Cold weather trip",
  contexts: {
    climateContextIds: ["fixture:context:snow"],
    accommodationContextIds: ["fixture:context:hotel"],
    transportContextIds: ["fixture:context:flight"],
    activityContextIds: ["fixture:context:outdoor-activities"],
  },
  bags: [
    ["main", "Main suitcase", "suitcase"],
    ["cabin", "Cabin bag", "cabin-bag"],
    ["boot", "Boot bag", "pouch"],
    ["gadget", "Gadget pouch", "pouch"],
    ["day", "Day pack", "day-bag"],
  ],
  itemSpecs: [
    ["Passports", "shared", "documents", "essential", "needed", "cabin", ["travel-day"]],
    ["Thermals", "shared", "clothing", "essential", "needed", "main"],
    ["Gloves", "shared", "clothing", "essential", "packed", "main"],
    ["Hats", "shared", "clothing", "important", "packed", "main"],
    ["Warm socks", "shared", "clothing", "important", "needed", "main"],
    ["Snow boots", "shared", "footwear", "essential", "to-decide", "boot"],
    ["Lip balm", "shared", "toiletries", "useful", "to-buy", undefined],
    ["Moisturiser", "shared", "toiletries", "useful", "needed", "main"],
    ["Camera battery", "phil", "electronics", "important", "to-charge", "gadget"],
    ["Printed insurance", "shared", "documents", "important", "to-download", "cabin"],
    ["Spare scarf", "shared", "clothing", "nice-to-have", "not-taking", "main"],
  ],
});

type ItemSpec = [
  name: string,
  owner: "beck" | "phil" | "seb" | "albert" | "shared" | "unassigned",
  category: string,
  priority: PackingItem["priority"],
  status: PackingItem["status"],
  bagKey?: string,
  flags?: string[],
];

function createFixture({
  bags,
  contexts,
  id,
  includeAlbert = false,
  itemSpecs,
  name,
  tripType,
}: {
  bags: [string, string, Bag["bagType"]][];
  contexts: Pick<
    Trip,
    | "activityContextIds"
    | "accommodationContextIds"
    | "climateContextIds"
    | "transportContextIds"
  >;
  id: string;
  includeAlbert?: boolean;
  itemSpecs: ItemSpec[];
  name: string;
  tripType: Trip["tripType"];
}): RealisticTripFixture {
  const tripId = `fixture:trip:${id}`;
  const travellers = [
    traveller("beck", "Beck", "adult"),
    traveller("phil", "Phil", "adult"),
    traveller("seb", "Seb", "child"),
    ...(includeAlbert ? [traveller("albert", "Albert", "dog")] : []),
  ];
  const travellerIds = travellers.map((entry) => entry.id);
  const fixtureBags = bags.map(([key, bagName, bagType]) =>
    bag(tripId, id, key, bagName, bagType),
  );
  const bagIds = new Map(bags.map(([key]) => [key, `fixture:bag:${id}:${key}`]));

  return {
    bags: fixtureBags,
    items: itemSpecs.map((spec, index) =>
      item(tripId, id, index, spec, bagIds.get(spec[5] ?? "")),
    ),
    travellers,
    trip: {
      id: tripId,
      name,
      tripType,
      startDate: "2026-08-01",
      endDate: "2026-08-08",
      nights: 7,
      destinations: ["Fixture destination"],
      ...contexts,
      travellerIds,
      status: "packing",
      createdAt: now,
      updatedAt: now,
    },
  };
}

function traveller(
  key: "beck" | "phil" | "seb" | "albert",
  name: string,
  travellerType: Traveller["travellerType"],
): Traveller {
  return {
    id: `fixture:traveller:${key}`,
    name,
    travellerType,
    defaultIncluded: key !== "albert",
    createdAt: now,
    updatedAt: now,
  };
}

function bag(
  tripId: string,
  fixtureId: string,
  key: string,
  name: string,
  bagType: Bag["bagType"],
): Bag {
  return {
    id: `fixture:bag:${fixtureId}:${key}`,
    tripId,
    name,
    bagType,
    isHandLuggage: bagType === "cabin-bag",
    isTravelDay: ["cabin-bag", "backpack", "day-bag"].includes(bagType),
    isCruiseEmbarkation: key === "embark",
    createdAt: now,
    updatedAt: now,
  };
}

function item(
  tripId: string,
  fixtureId: string,
  index: number,
  [name, owner, category, priority, status, _bagKey, flags = []]: ItemSpec,
  bagId?: string,
): PackingItem {
  const ownershipScope =
    owner === "shared" ? "shared" : owner === "unassigned" ? "unassigned" : "traveller";
  return {
    id: `fixture:item:${fixtureId}:${index}`,
    tripId,
    name,
    ownershipScope,
    ownerTravellerId:
      ownershipScope === "traveller" ? `fixture:traveller:${owner}` : undefined,
    category,
    quantity: 1,
    priority,
    status,
    bagId,
    flags,
    dependencyItemIds: [],
    source: index > 20 ? "manual" : "template",
    forgottenRisk: ["documents", "health", "electronics"].includes(category),
    createdAt: now,
    updatedAt: now,
  };
}
