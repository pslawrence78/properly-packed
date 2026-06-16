import { describe, expect, it } from "vitest";
import type { Outfit, OutfitItem } from "../db/types";
import {
  calculateOutfitProgress,
  findUnplannedDayAndEveningSlots,
} from "../features/outfits/outfit-utils";

describe("outfit utilities", () => {
  it("calculates outfit progress and shoes/accessories summary", () => {
    const outfits: Outfit[] = [
      outfit("outfit:1", "packed", true, 1, "day"),
      outfit("outfit:2", "still-deciding", false, 1, "evening"),
      outfit("outfit:3", "not-taking", false, 2, "day"),
    ];
    const items: OutfitItem[] = [
      outfitItem("item:1", "shoes", "packed"),
      outfitItem("item:2", "accessory", "needed"),
      outfitItem("item:3", "jewellery", "packed"),
    ];

    expect(calculateOutfitProgress(outfits, items)).toMatchObject({
      outfitCount: 3,
      packedCount: 1,
      decidingCount: 1,
      rewearCount: 1,
      itemCount: 3,
      packedItemCount: 2,
      shoeCount: 1,
      accessoryCount: 2,
      percentPacked: 50,
    });
  });

  it("finds missing day and evening outfit slots", () => {
    const outfits: Outfit[] = [
      outfit("outfit:1", "planned", false, 1, "day"),
      outfit("outfit:2", "planned", false, 2, "evening"),
    ];

    expect(findUnplannedDayAndEveningSlots(1, outfits)).toEqual([
      { day: 1, outfitType: "evening" },
      { day: 2, outfitType: "day" },
    ]);
  });
});

function outfit(
  id: string,
  status: Outfit["status"],
  rewearEligible: boolean,
  plannedForDay: number,
  outfitType: Outfit["outfitType"],
): Outfit {
  return {
    id,
    tripId: "trip:1",
    ownerTravellerId: "traveller:beck",
    name: id,
    outfitType,
    plannedForDay,
    status,
    rewearEligible,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

function outfitItem(
  id: string,
  itemType: OutfitItem["itemType"],
  status: OutfitItem["status"],
): OutfitItem {
  return {
    id,
    outfitId: "outfit:1",
    name: id,
    itemType,
    status,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}
