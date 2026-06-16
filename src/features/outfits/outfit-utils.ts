import type { Outfit, OutfitItem, OutfitItemType, OutfitStatus, OutfitType } from "../../db/types";

export const outfitTypeOptions: { value: OutfitType; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "evening", label: "Evening" },
  { value: "travel-day", label: "Travel day" },
  { value: "pool", label: "Pool" },
  { value: "beach", label: "Beach" },
  { value: "formal-night", label: "Formal night" },
  { value: "theme-park", label: "Theme park" },
  { value: "cold-weather", label: "Cold weather" },
  { value: "special-occasion", label: "Special occasion" },
];

export const outfitStatusOptions: { value: OutfitStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "partially-planned", label: "Partially planned" },
  { value: "still-deciding", label: "Still deciding" },
  { value: "packed", label: "Packed" },
  { value: "rewear-option", label: "Rewear option" },
  { value: "not-taking", label: "Not taking" },
];

export const outfitItemTypeOptions: { value: OutfitItemType; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "dress", label: "Dress" },
  { value: "outerwear", label: "Outerwear" },
  { value: "shoes", label: "Shoes" },
  { value: "accessory", label: "Accessory" },
  { value: "jewellery", label: "Jewellery" },
  { value: "bag", label: "Bag" },
  { value: "other", label: "Other" },
];

export type OutfitProgress = {
  outfitCount: number;
  packedCount: number;
  decidingCount: number;
  rewearCount: number;
  itemCount: number;
  packedItemCount: number;
  shoeCount: number;
  accessoryCount: number;
  percentPacked: number;
};

export type UnplannedOutfitSlot = {
  day: number;
  outfitType: "day" | "evening";
};

export function calculateOutfitProgress(
  outfits: Outfit[],
  outfitItems: OutfitItem[],
): OutfitProgress {
  const packableOutfits = outfits.filter((outfit) => outfit.status !== "not-taking");
  const packedCount = packableOutfits.filter((outfit) => outfit.status === "packed").length;
  const itemCount = outfitItems.length;
  const packedItemCount = outfitItems.filter((item) => item.status === "packed").length;

  return {
    outfitCount: outfits.length,
    packedCount,
    decidingCount: outfits.filter((outfit) => outfit.status === "still-deciding").length,
    rewearCount: outfits.filter((outfit) => outfit.rewearEligible).length,
    itemCount,
    packedItemCount,
    shoeCount: outfitItems.filter((item) => item.itemType === "shoes").length,
    accessoryCount: outfitItems.filter((item) =>
      ["accessory", "jewellery", "bag"].includes(item.itemType),
    ).length,
    percentPacked:
      packableOutfits.length === 0
        ? 0
        : Math.round((packedCount / packableOutfits.length) * 100),
  };
}

export function findUnplannedDayAndEveningSlots(
  nights: number,
  outfits: Outfit[],
): UnplannedOutfitSlot[] {
  const dayCount = Math.max(1, nights + 1);
  const slots: UnplannedOutfitSlot[] = [];

  for (let day = 1; day <= dayCount; day += 1) {
    for (const outfitType of ["day", "evening"] as const) {
      const planned = outfits.some(
        (outfit) =>
          outfit.plannedForDay === day &&
          outfit.outfitType === outfitType &&
          outfit.status !== "not-taking",
      );

      if (!planned) {
        slots.push({ day, outfitType });
      }
    }
  }

  return slots;
}
