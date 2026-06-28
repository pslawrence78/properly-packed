import { describe, expect, it } from "vitest";
import type { Bag, PackingItem, Traveller } from "../db/types";
import { buildBulkPackingItemInputs } from "../features/packing-items/bulk-capture-commit";
import { buildBulkCaptureRows } from "../features/packing-items/bulk-capture-enrichment";
import { parseBulkCaptureLine, parseBulkCaptureText } from "../features/packing-items/bulk-capture-parser";

const travellers = [
  traveller("traveller:beck", "Beck", "adult"),
  traveller("traveller:phil", "Phil", "adult"),
  traveller("traveller:seb", "Seb", "child"),
  traveller("traveller:shared", "Shared Family", "adult"),
  traveller("traveller:albert", "Albert", "dog"),
];
const bags = [
  bag("bag:gadget", "Gadget bag"),
  bag("bag:docs", "Travel documents pouch"),
  bag("bag:hand", "Hand luggage"),
  bag("bag:car", "Car boot"),
];
const categories = [
  "clothing",
  "documents",
  "electronics",
  "health",
  "entertainment",
  "cruise-extras",
  "misc",
  "pet",
];

describe("bulk capture parsing and enrichment", () => {
  it("parses plain lines, trims whitespace and ignores blanks", () => {
    expect(parseBulkCaptureText(" swim goggles \n\n sun cream ")).toMatchObject([
      { name: "swim goggles", quantity: 1 },
      { name: "sun cream", quantity: 1 },
    ]);
  });

  it("parses owner prefixes, quantities, slash metadata and action verbs", () => {
    expect(parseBulkCaptureLine("Beck: sandals x2")).toMatchObject({
      ownerToken: "Beck",
      name: "sandals",
      quantity: 2,
    });
    expect(parseBulkCaptureLine("Shared: sun cream / to buy")).toMatchObject({
      ownerToken: "Shared",
      name: "sun cream",
      slashTokens: ["to buy"],
    });
    expect(parseBulkCaptureLine("charge iPad")).toMatchObject({
      name: "iPad",
      status: "to-charge",
    });
  });

  it("flags invalid quantity without guessing silently", () => {
    expect(parseBulkCaptureLine("socks xmany")).toMatchObject({
      name: "socks xmany",
      quantity: 1,
      warnings: ['Invalid quantity "many".'],
    });
  });

  it("enriches required examples deterministically", () => {
    const rows = rowsFor(`Seb: swim goggles
Beck: sandals x2
Shared: sun cream / to buy
Phil: power bank / to charge / gadget bag
Shared Family: passports / essential / travel documents pouch
Seb: Toniebox / hand luggage / to charge
Albert: dog towel / car boot
buy sun cream
download films
wash swim shorts
decide evening shoes`);

    expect(rows.find((row) => row.name === "swim goggles")).toMatchObject({
      ownerTravellerId: "traveller:seb",
      category: "misc",
    });
    expect(rows.find((row) => row.name === "sandals")).toMatchObject({
      ownerTravellerId: "traveller:beck",
      quantity: 2,
      category: "clothing",
    });
    expect(rows.find((row) => row.name === "power bank")).toMatchObject({
      ownerTravellerId: "traveller:phil",
      status: "to-charge",
      bagId: "bag:gadget",
    });
    expect(rows.find((row) => row.name === "passports")).toMatchObject({
      ownerTravellerId: "traveller:shared",
      priority: "essential",
      category: "documents",
      bagId: "bag:docs",
    });
    expect(rows.find((row) => row.name === "sun cream")).toMatchObject({
      status: "to-buy",
      category: "health",
    });
    expect(rows.find((row) => row.name === "films")).toMatchObject({
      status: "to-download",
      category: "entertainment",
    });
  });

  it("surfaces unknown owners and slash tokens for review", () => {
    const [row] = rowsFor("Morgan: camera / mystery pouch");
    expect(row).toMatchObject({
      included: false,
      warnings: expect.arrayContaining([
        'Unknown owner "Morgan".',
        'Unresolved metadata "mystery pouch".',
      ]),
      notes: ["Unresolved: mystery pouch"],
    });
  });

  it("detects duplicates inside the batch and against trip items", () => {
    const existing = [
      packingItem("item:1", "passport", "traveller:shared", "documents"),
    ];
    const rows = rowsFor("Shared Family: passport\nSeb: Toniebox\nSeb: Toniebox", existing);

    expect(rows[0]).toMatchObject({
      duplicate: true,
      included: false,
      duplicateReason: 'Matches existing item "passport".',
    });
    expect(rows[2]).toMatchObject({
      duplicate: true,
      included: false,
      duplicateReason: "Matches line 2.",
    });
  });

  it("builds safe create payloads for included rows", () => {
    const rows = rowsFor("Phil: camera memory cards / photography");
    const [input] = buildBulkPackingItemInputs(rows, "trip:1");
    expect(input).toMatchObject({
      tripId: "trip:1",
      name: "camera memory cards",
      ownerTravellerId: "traveller:phil",
      category: "electronics",
    });
  });
});

function rowsFor(text: string, existingItems: PackingItem[] = []) {
  return buildBulkCaptureRows(parseBulkCaptureText(text), {
    bags,
    categories,
    existingItems,
    travellers,
    tripId: "trip:1",
  });
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

function bag(id: string, name: string): Bag {
  return {
    id,
    tripId: "trip:1",
    name,
    bagType: "pouch",
    isHandLuggage: false,
    isTravelDay: false,
    isCruiseEmbarkation: false,
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
