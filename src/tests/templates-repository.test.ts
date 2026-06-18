import { afterEach, describe, expect, it } from "vitest";
import { ProperlyPackedDatabase } from "../db";
import {
  applyTemplateToTrip,
  buildTemplatePreview,
  hasDuplicatePackingItem,
  previewTemplatesForTrip,
  rulesApply,
} from "../db/repositories/templates-repository";
import { addUsefulExtraToTrip } from "../db/repositories/useful-extras-repository";
import { applyInitialSeed } from "../db/seed";
import type {
  ContextOption,
  PackingItem,
  Template,
  TemplateItem,
  Traveller,
  Trip,
} from "../db/types";

const testDatabases: ProperlyPackedDatabase[] = [];

function createTestDatabase() {
  const db = new ProperlyPackedDatabase(`properly-packed-test-${crypto.randomUUID()}`);
  testDatabases.push(db);
  return db;
}

afterEach(async () => {
  await Promise.all(
    testDatabases.splice(0).map(async (db) => {
      db.close();
      await db.delete();
    }),
  );
});

describe("templates repository", () => {
  it("matches template rules against trip context", () => {
    const trip = tripRow("trip:1", ["traveller:alex"], {
      activityContexts: ["formal-night"],
    });

    expect(
      rulesApply(
        [{ field: "activityContexts", operator: "includes", value: "formal-night" }],
        trip,
      ),
    ).toBe(true);
    expect(
      rulesApply(
        [{ field: "activityContexts", operator: "not-includes", value: "formal-night" }],
        trip,
      ),
    ).toBe(false);
  });

  it("matches ID-based and legacy template rules through inactive selected contexts", () => {
    const context: ContextOption = {
      id: "context:pool",
      type: "activity",
      label: "Pool",
      active: false,
      sortOrder: 1,
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:00.000Z",
    };
    const idBasedTrip = tripRow("trip:id-context", ["traveller:adult"], {
      activityContextIds: [context.id],
      activityContexts: [],
    });

    expect(
      rulesApply(
        [{ field: "activityContextIds", operator: "includes", value: "pool" }],
        idBasedTrip,
        [context],
      ),
    ).toBe(true);
    expect(
      rulesApply(
        [{ field: "activityContexts", operator: "includes", value: "pool" }],
        idBasedTrip,
        [context],
      ),
    ).toBe(true);
    expect(
      rulesApply(
        [{ field: "activityContextIds", operator: "includes", value: context.id }],
        idBasedTrip,
        [context],
      ),
    ).toBe(true);
  });

  it("expands neutral traveller targets and surfaces unresolved targets safely", () => {
    const template = templateRow();
    const travellers = [
      traveller("traveller:adult", "Adult traveller", "adult"),
      traveller("traveller:child", "Child traveller", "child"),
      traveller("traveller:pet", "Pet traveller", "dog"),
    ];
    const trip = tripRow("trip:targets", travellers.map((row) => row.id), {
      tripType: "city-break",
      activityContexts: [],
      accommodationTypes: [],
      transportModes: [],
    });
    const preview = buildTemplatePreview(
      template,
      [
        templateItem("each", "Medication pouch", "each-traveller"),
        templateItem("adult", "Travel documents", "selected-adult"),
        templateItem("child", "Child headphones", "selected-child"),
        templateItem("pet", "Pet blanket", "dog"),
        templateItem("shared", "Power bank", "shared"),
        templateItem("decision", "Optional jacket", "unassigned", ["decide"]),
      ],
      trip,
      travellers,
      [],
    );

    expect(
      preview.suggestions.filter((row) => row.templateItem.id === "item:each"),
    ).toHaveLength(3);
    expect(
      preview.suggestions.find((row) => row.templateItem.id === "item:shared"),
    ).toMatchObject({ ownershipScope: "shared", ownerTraveller: undefined });
    expect(
      preview.suggestions.find((row) => row.templateItem.id === "item:decision"),
    ).toMatchObject({ ownershipScope: "unassigned", packingStatus: "to-decide" });
    expect(
      preview.suggestions.find((row) => row.templateItem.id === "item:child")
        ?.ownerTraveller?.travellerType,
    ).toBe("child");
    expect(
      preview.suggestions.find((row) => row.templateItem.id === "item:pet")
        ?.ownerTraveller?.travellerType,
    ).toBe("dog");

    const unresolved = buildTemplatePreview(
      template,
      [templateItem("missing-child", "Child sun hat", "selected-child")],
      { ...trip, travellerIds: ["traveller:adult"] },
      travellers,
      [],
    );
    expect(unresolved.suggestions[0]).toMatchObject({
      ownershipScope: "unassigned",
      status: "skipped",
    });
    expect(unresolved.suggestions[0].reason).toContain("no matching child traveller");
  });

  it("uses category-aware duplicate keys and exposes skipped duplicates", () => {
    const template = templateRow();
    const trip = tripRow("trip:duplicates", [], {
      tripType: "city-break",
      activityContexts: [],
      accommodationTypes: [],
      transportModes: [],
    });
    const manual = {
      ...packingItem("manual:1", "Travel documents", "shared"),
      tripId: trip.id,
      category: "documents",
    };
    const preview = buildTemplatePreview(
      template,
      [
        templateItem("documents", "Travel documents", "shared", [], "documents"),
        templateItem("misc", "Travel documents", "shared", [], "misc"),
      ],
      trip,
      [],
      [manual],
    );

    expect(preview.duplicateCount).toBe(1);
    expect(preview.newCount).toBe(1);
    expect(preview.suggestions[0].reason).toContain("already exists");
    expect(manual.source).toBe("manual");
  });

  it("detects duplicate suggestions by owner and normalised name", () => {
    const items: PackingItem[] = [
      packingItem("packing-item:1", "  Passports ", "shared"),
    ];

    expect(hasDuplicatePackingItem(items, "passports", "shared")).toBe(true);
    expect(
      hasDuplicatePackingItem(items, "passports", "traveller", "traveller:alex"),
    ).toBe(false);
  });

  it("previews and applies cruise templates with source tracking", async () => {
    const db = createTestDatabase();
    await applyInitialSeed(db, () => "2026-06-16T00:00:00.000Z");
    const travellers = [
      traveller("traveller:alex", "Alex", "adult"),
      traveller("traveller:riley", "Riley", "child"),
    ];
    await db.travellers.bulkAdd(travellers);
    const trip = tripRow("trip:cruise", travellers.map((traveller) => traveller.id));
    await db.trips.add(trip);

    const previews = await previewTemplatesForTrip(trip, travellers, db);
    const cruisePreview = previews.find((preview) => preview.template.name === "Cruise");

    expect(cruisePreview?.newCount).toBeGreaterThan(0);

    const result = await applyTemplateToTrip(
      cruisePreview!.template.id,
      trip,
      travellers,
      db,
    );
    const insertedItems = await db.packingItems.where("tripId").equals(trip.id).toArray();

    expect(result.inserted).toBe(cruisePreview?.newCount);
    expect(insertedItems[0]).toMatchObject({
      ownershipScope: expect.stringMatching(/shared|traveller/),
      source: "template",
      status: "needed",
    });
    expect(insertedItems.every((item) => item.sourceId)).toBe(true);

    const secondResult = await applyTemplateToTrip(
      cruisePreview!.template.id,
      trip,
      travellers,
      db,
    );

    expect(secondResult.inserted).toBe(0);
    expect(secondResult.skippedDuplicates).toBe(insertedItems.length);
  });

  it("applies each-traveller and unassigned decision items with clean metadata", async () => {
    const db = createTestDatabase();
    const travellers = [
      traveller("traveller:adult", "Adult traveller", "adult"),
      traveller("traveller:child", "Child traveller", "child"),
    ];
    const trip = tripRow("trip:neutral-apply", travellers.map((row) => row.id), {
      tripType: "city-break",
      activityContexts: [],
      accommodationTypes: [],
      transportModes: [],
    });
    const template = templateRow();
    await db.travellers.bulkAdd(travellers);
    await db.trips.add(trip);
    await db.templates.add(template);
    await db.templateItems.bulkAdd([
      templateItem("each-apply", "Medication pouch", "each-traveller"),
      templateItem("decision-apply", "Optional jacket", "unassigned", ["decide"]),
    ]);

    const result = await applyTemplateToTrip(template.id, trip, travellers, db);
    const generated = await db.packingItems.where("tripId").equals(trip.id).toArray();

    expect(result.inserted).toBe(3);
    expect(generated.filter((item) => item.name === "Medication pouch")).toHaveLength(2);
    const decisionItem = generated.find((item) => item.name === "Optional jacket");
    expect(decisionItem).toMatchObject({
      ownershipScope: "unassigned",
      ownerTravellerId: undefined,
      status: "to-decide",
      source: "template",
      sourceId: "item:decision-apply",
    });
    expect(decisionItem).not.toHaveProperty("bagId");
  });

  it("adds useful extras to a trip with source tracking", async () => {
    const db = createTestDatabase();
    await applyInitialSeed(db, () => "2026-06-16T00:00:00.000Z");
    const travellers = [traveller("traveller:alex", "Alex", "adult")];
    await db.travellers.bulkAdd(travellers);
    const trip = tripRow("trip:fly-cruise", ["traveller:alex"], {
      tripType: "fly-cruise",
      transportModes: ["flight"],
    });
    const extra = await db.usefulExtras.get(
      "seed:useful-extra:plane-comfort:empty-water-bottle",
    );

    await db.trips.add(trip);
    const result = await addUsefulExtraToTrip(extra!.id, trip, travellers, db);
    const items = await db.packingItems.where("tripId").equals(trip.id).toArray();

    expect(result).toEqual({ inserted: true });
    expect(items).toMatchObject([
      {
        name: "Empty water bottle",
        ownershipScope: "shared",
        source: "useful-extra",
        sourceId: extra!.id,
        forgottenRisk: true,
      },
    ]);
  });
});

function templateRow(): Template {
  return {
    id: "template:test",
    name: "Travel template",
    applicableTripTypes: ["city-break"],
    applicableTravellers: ["adult", "child", "dog"],
    applicableContexts: [],
    active: true,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
  };
}

function templateItem(
  id: string,
  name: string,
  ownerType: TemplateItem["ownerType"],
  flags: string[] = [],
  category = "misc",
): TemplateItem {
  return {
    id: `item:${id}`,
    templateId: "template:test",
    name,
    ownerType,
    category,
    quantity: 1,
    priority: "important",
    flags,
    conditionRules: [],
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
  };
}

function tripRow(
  id: string,
  travellerIds: string[],
  overrides: Partial<Trip> = {},
): Trip {
  return {
    id,
    name: "Cruise test",
    tripType: "cruise",
    startDate: "2026-08-01",
    endDate: "2026-08-08",
    nights: 7,
    destinations: ["Southampton"],
    climateContextIds: [],
    accommodationContextIds: [],
    transportContextIds: [],
    activityContextIds: [],
    accommodationTypes: ["ship"],
    transportModes: ["ship"],
    activityContexts: ["formal-night", "pool"],
    travellerIds,
    status: "planning",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
    ...overrides,
  };
}

function packingItem(
  id: string,
  name: string,
  ownershipScope: PackingItem["ownershipScope"],
  ownerTravellerId?: Traveller["id"],
): PackingItem {
  return {
    id,
    tripId: "trip:1",
    name,
    ownershipScope,
    ownerTravellerId,
    category: "documents",
    quantity: 1,
    priority: "essential",
    status: "needed",
    flags: [],
    dependencyItemIds: [],
    source: "manual",
    forgottenRisk: false,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

function traveller(
  id: string,
  name: string,
  travellerType: Traveller["travellerType"],
): Traveller {
  return {
    id,
    name,
    travellerType,
    defaultIncluded: true,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}
