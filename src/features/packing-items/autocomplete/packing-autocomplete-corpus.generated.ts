import type { PackingAutocompleteEntry } from "./packing-autocomplete-types";

function entry(
  id: string,
  name: string,
  options: Omit<PackingAutocompleteEntry, "id" | "name" | "aliases"> & {
    aliases?: string[];
  } = {},
): PackingAutocompleteEntry {
  return { id, name, aliases: options.aliases ?? [], ...options };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function expandGrid(
  groupId: string,
  defaults: Omit<PackingAutocompleteEntry, "id" | "name" | "aliases">,
  rowPrefixes: string[],
  suffixes: string[],
): PackingAutocompleteEntry[] {
  const entries: PackingAutocompleteEntry[] = [];
  for (const rowPrefix of rowPrefixes) {
    for (const suffix of suffixes) {
      const name = `${rowPrefix} ${suffix}`.replace(/\s+/g, " ").trim();
      entries.push(
        entry(`${groupId}:${slugify(name)}`, name, {
          ...defaults,
        }),
      );
    }
  }
  return entries;
}

export const generatedPackingAutocompleteEntries: PackingAutocompleteEntry[] = [
  ...expandGrid(
    "generated:fabric-clothing",
    { categoryHint: "clothing", ownerHint: "beck", priorityHint: "important" },
    ["Linen", "Cotton", "Silk", "Denim", "Knit"],
    ["dress", "skirt", "top", "trousers"],
  ),
  ...expandGrid(
    "generated:fit-clothing",
    { categoryHint: "clothing", ownerHint: "adult", priorityHint: "important" },
    ["Wide-leg", "Cropped", "Tailored", "Straight-leg", "Relaxed"],
    ["trousers", "jeans", "shorts", "leggings"],
  ),
  ...expandGrid(
    "generated:occasion-clothing",
    { categoryHint: "clothing", ownerHint: "beck", priorityHint: "important" },
    ["Day", "Midi", "Maxi", "Wrap", "Shirt"],
    ["dress", "skirt", "jumpsuit", "outfit"],
  ),
  ...expandGrid(
    "generated:tops",
    { categoryHint: "clothing", ownerHint: "adult", priorityHint: "important" },
    ["Vest", "Camisole", "Printed", "Smart", "Floaty"],
    ["top", "shirt", "blouse", "tee"],
  ),
  ...expandGrid(
    "generated:outerwear",
    { categoryHint: "clothing", ownerHint: "adult", priorityHint: "important" },
    ["Denim", "Trench", "Rain", "Puffer", "Lightweight"],
    ["jacket", "coat", "gilet", "shacket"],
  ),
  ...expandGrid(
    "generated:swimwear",
    { categoryHint: "swim", ownerHint: "adult", priorityHint: "important", tripTypeHints: ["beach-holiday", "cruise", "fly-cruise"] },
    ["One-piece", "Tankini", "Swim", "Beach", "Pool"],
    ["swimsuit", "cover-up", "kaftan", "sarong"],
  ),
  ...expandGrid(
    "generated:shoes-accessories",
    { categoryHint: "clothing", ownerHint: "adult", priorityHint: "important" },
    ["Platform", "Block-heel", "Ballet", "Espadrille", "Chunky"],
    ["sandals", "heels", "flats", "boots"],
  ),
  ...expandGrid(
    "generated:travel-accessories",
    { categoryHint: "travel-day", ownerHint: "shared", priorityHint: "useful" },
    ["Crossbody", "Tote", "Clutch", "Jewellery", "Hair"],
    ["bag", "pouch", "roll", "accessories"],
  ),
  ...expandGrid(
    "generated:dental",
    { categoryHint: "toiletries", ownerHint: "shared", priorityHint: "important" },
    ["Travel", "Mini", "Electric", "Mint", "Fluoride"],
    ["toothbrush", "toothpaste", "floss", "mouthwash"],
  ),
  ...expandGrid(
    "generated:hair",
    { categoryHint: "toiletries", ownerHint: "beck", priorityHint: "important" },
    ["Hair", "Dry", "Curling", "Straightening", "Detangling"],
    ["brush", "dryer", "tongs", "mask"],
  ),
  ...expandGrid(
    "generated:beauty",
    { categoryHint: "toiletries", ownerHint: "beck", priorityHint: "important" },
    ["Liquid", "Cream", "Powder", "Matte", "Glow"],
    ["foundation", "concealer", "blush", "mirror"],
  ),
  ...expandGrid(
    "generated:health",
    { categoryHint: "health", ownerHint: "shared", priorityHint: "important" },
    ["Sun protection", "Travel sickness", "Prescription", "First-aid", "Lens"],
    ["lotion", "pills", "pouch", "solution"],
  ),
  ...expandGrid(
    "generated:charging",
    { categoryHint: "electronics", ownerHint: "shared", priorityHint: "important" },
    ["USB-C", "Lightning", "Universal", "Compact", "Multi-port"],
    ["charging cable", "charging plug", "travel adapter", "charging hub"],
  ),
  ...expandGrid(
    "generated:photography",
    { categoryHint: "electronics", ownerHint: "phil", priorityHint: "important", statusHint: "to-charge" },
    ["Spare", "Wide-angle", "Telephoto", "Protective", "Foldable"],
    ["camera battery", "memory card", "lens", "tripod"],
  ),
  ...expandGrid(
    "generated:gadgets",
    { categoryHint: "electronics", ownerHint: "shared", priorityHint: "important" },
    ["Foldable", "Portable", "Wireless", "Magnetic", "Travel"],
    ["phone stand", "tablet stand", "device case", "camera case"],
  ),
  ...expandGrid(
    "generated:connectivity",
    { categoryHint: "electronics", ownerHint: "shared", priorityHint: "important" },
    ["Luggage", "Travel", "Pocket", "Bluetooth", "Foldable"],
    ["tracker", "hotspot", "router", "splitter"],
  ),
  ...expandGrid(
    "generated:kids-play",
    { categoryHint: "entertainment", ownerHint: "seb", priorityHint: "important", familySpecific: true },
    ["Story", "Colouring", "Puzzle", "Sticker", "Mini"],
    ["book", "game", "set", "pack"],
  ),
  ...expandGrid(
    "generated:kids-tech",
    { categoryHint: "entertainment", ownerHint: "seb", priorityHint: "important", familySpecific: true, statusHint: "to-charge" },
    ["Toniebox", "Tablet", "Child", "Kids", "Portable"],
    ["headset", "charger", "download pack", "game pack"],
  ),
  ...expandGrid(
    "generated:travel-docs",
    { categoryHint: "documents", ownerHint: "shared", priorityHint: "essential" },
    ["Passport", "Boarding", "Travel", "Luggage", "Insurance"],
    ["holder", "wallet", "tags", "pouch"],
  ),
  ...expandGrid(
    "generated:cruise-extras",
    { categoryHint: "cruise-extras", ownerHint: "shared", priorityHint: "useful", familySpecific: true, tripTypeHints: ["cruise", "fly-cruise", "ex-uk-cruise"] },
    ["Cruise card", "Cabin", "Packing", "Day", "Waterproof"],
    ["lanyards", "hooks", "organiser", "bag"],
  ),
  ...expandGrid(
    "generated:dog",
    { categoryHint: "pet", ownerHint: "albert", priorityHint: "important", familySpecific: true },
    ["Dog walking", "Albert travel", "Dog beach", "Travel", "Water-resistant"],
    ["lead", "towel", "harness", "bed"],
  ),
];
