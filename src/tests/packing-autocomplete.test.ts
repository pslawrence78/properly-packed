import { describe, expect, it } from "vitest";
import type { PackingItem, Traveller } from "../db/types";
import { packingAutocompleteCorpus } from "../features/packing-items/autocomplete/packing-autocomplete-corpus";
import { searchPackingAutocomplete } from "../features/packing-items/autocomplete/packing-autocomplete-search";
import { normaliseAutocompleteText } from "../features/packing-items/autocomplete/packing-autocomplete-utils";

const categories = [
  "clothing",
  "documents",
  "electronics",
  "health",
  "toiletries",
  "comfort",
  "entertainment",
  "travel-day",
  "cruise-extras",
  "swim",
  "misc",
  "pet",
  "weather",
  "laundry",
];

const travellers: Traveller[] = [
  traveller("traveller:beck", "Beck", "adult"),
  traveller("traveller:phil", "Phil", "adult"),
  traveller("traveller:seb", "Seb", "child"),
  traveller("traveller:albert", "Albert", "dog"),
];

describe("packing autocomplete corpus", () => {
  it("has expanded to at least 500 curated entries", () => {
    expect(packingAutocompleteCorpus.length).toBeGreaterThanOrEqual(500);
  });

  it("has unique IDs and non-empty names", () => {
    const ids = new Set<string>();
    const normalisedNames = new Set<string>();
    for (const entry of packingAutocompleteCorpus) {
      expect(entry.name.trim()).not.toBe("");
      expect(ids.has(entry.id)).toBe(false);
      expect(
        normalisedNames.has(normaliseAutocompleteText(entry.name)),
        `Duplicate normalised name: ${entry.name}`,
      ).toBe(false);
      ids.add(entry.id);
      normalisedNames.add(normaliseAutocompleteText(entry.name));
    }
  });

  it("marks required Lawrence-family examples", () => {
    const required = [
      "Toniebox",
      "Tonies",
      "Jellycat",
      "Tablet headphones",
      "Swim goggles",
      "Cruise lanyards",
      "Magnetic hooks",
      "AirTags",
      "Phone stand",
      "Power bank",
      "Drone batteries",
      "Drone controller",
      "Camera memory cards",
      "Disney/theme park ponchos",
      "Albert lead",
      "Albert towel",
      "Albert bowls",
      "Albert dog bed",
      "Travel day snacks",
      "Downloaded films",
      "iPad/tablet charger",
      "Seb bedtime comfort item",
    ];

    for (const name of required) {
      expect(packingAutocompleteCorpus.find((entry) => entry.name === name)).toMatchObject({
        familySpecific: true,
      });
    }
  });

  it("covers representative broad groups", () => {
    expect(names()).toEqual(expect.arrayContaining([
      "Passports",
      "T-shirts",
      "Midi dress",
      "Wide-leg trousers",
      "Vest top",
      "One-piece swimsuit",
      "Toothbrush",
      "Phone charger",
      "Camera memory cards",
      "Toniebox",
      "Cruise lanyards",
      "Beach bag",
      "Disney/theme park ponchos",
      "Thermals",
      "Car charger",
      "Albert lead",
      "Ziplock bags",
    ]));
  });

  it("does not duplicate aliases inside a record", () => {
    for (const entry of packingAutocompleteCorpus) {
      expect(new Set(entry.aliases.map((alias) => alias.toLowerCase())).size).toBe(
        entry.aliases.length,
      );
    }
  });
});

describe("packing autocomplete search", () => {
  it("matches prefixes, aliases, case and contains text", () => {
    expect(searchPackingAutocomplete("swi", { categories, travellers }).map((suggestion) => suggestion.entry.name)).toContain("Swim goggles");
    expect(searchPackingAutocomplete("air tags")[0].entry.name).toBe("AirTags");
    expect(searchPackingAutocomplete("TON")[0].entry.name).toBe("Toniebox");
    expect(searchPackingAutocomplete("memory", { categories, travellers }).map((suggestion) => suggestion.entry.name)).toContain("Camera memory cards");
  });

  it.each([
    ["dress", "Midi dress"],
    ["sand", "Sandals"],
    ["gog", "Swim goggles"],
    ["tonie", "Toniebox"],
    ["usb", "USB-C cable"],
    ["power", "Power bank"],
    ["lanyard", "Cruise lanyards"],
    ["magnet", "Magnetic hooks"],
    ["plaster", "Plasters"],
    ["poncho", "Disney/theme park ponchos"],
    ["airtag", "AirTags"],
    ["swim", "Swim goggles"],
    ["tablet", "Tablet"],
    ["camera", "Camera"],
  ])("returns representative suggestion for %s", (query, expectedName) => {
    expect(
      searchPackingAutocomplete(query, { categories, travellers }).map(
        (suggestion) => suggestion.entry.name,
      ),
    ).toContain(expectedName);
  });

  it("ranks prefix matches above contains matches and caps results", () => {
    const results = searchPackingAutocomplete("car", { categories, travellers }, 3);
    expect(results).toHaveLength(3);
    expect(results[0].entry.name.toLowerCase()).toMatch(/^car|^cardigan|^camera/);
  });

  it.each([
    ["ton", "Toniebox"],
    ["jelly", "Jellycat"],
    ["lany", "Cruise lanyards"],
    ["mag", "Magnetic hooks"],
    ["air", "AirTags"],
    ["drone", "Drone"],
    ["memory", "Camera memory cards"],
    ["pon", "Disney/theme park ponchos"],
    ["dog", "Dog beach bed"],
    ["pass", "Passports"],
    ["sun", "Sun cream"],
    ["charg", "Charging hub"],
    ["swi", "Swim shorts"],
    ["shoe", "Comfortable shoes"],
    ["therm", "Thermals"],
  ])("returns %s suggestions", (query, expectedName) => {
    expect(searchPackingAutocomplete(query, { categories, travellers }).map((suggestion) => suggestion.entry.name)).toContain(expectedName);
  });

  it("de-prioritises but keeps existing duplicate suggestions", () => {
    const existingItems = [
      packingItem("item:1", "Toniebox", "traveller:seb", "entertainment"),
    ];
    const result = searchPackingAutocomplete("ton", {
      categories,
      existingItems,
      travellers,
    }).find((suggestion) => suggestion.entry.name === "Toniebox");
    expect(result).toMatchObject({
      duplicate: true,
      duplicateReason: 'Already in this trip as "Toniebox".',
    });
  });
});

function names() {
  return packingAutocompleteCorpus.map((entry) => entry.name);
}

function traveller(id: string, name: string, travellerType: Traveller["travellerType"]): Traveller {
  return {
    id,
    name,
    travellerType,
    defaultIncluded: true,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
  };
}

function packingItem(
  id: string,
  name: string,
  ownerTravellerId: string,
  category: string,
): PackingItem {
  return {
    id,
    tripId: "trip:1",
    name,
    ownershipScope: "traveller",
    ownerTravellerId,
    category,
    quantity: 1,
    priority: "important",
    status: "needed",
    flags: [],
    dependencyItemIds: [],
    source: "manual",
    forgottenRisk: false,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
  };
}
