import type {
  ItemOwnershipScope,
  PackingPriority,
  PackingStatus,
  Traveller,
} from "../../db/types";
import type {
  BulkCaptureContext,
  BulkCaptureRow,
  BulkParsedLine,
} from "./bulk-capture-types";
import {
  createDuplicateKey,
  findExistingDuplicate,
  matchBagByToken,
  matchCategoryByToken,
  matchTravellerByToken,
  normaliseBulkToken,
} from "./bulk-capture-utils";
import { findBestPackingAutocompleteMatch } from "./autocomplete/packing-autocomplete-search";

const STATUS_TOKENS: Record<string, PackingStatus> = {
  needed: "needed",
  packed: "packed",
  ready: "ready",
  "to buy": "to-buy",
  "to charge": "to-charge",
  "to decide": "to-decide",
  "to download": "to-download",
  "to wash": "to-wash",
};

const PRIORITY_TOKENS: Record<string, PackingPriority> = {
  essential: "essential",
  important: "important",
  useful: "useful",
  luxury: "luxury",
  "nice to have": "nice-to-have",
  "consider leaving": "consider-leaving",
};

const CATEGORY_RULES: { category: string; tokens: string[] }[] = [
  { category: "documents", tokens: ["passport", "boarding pass", "travel insurance", "ticket", "luggage tag", "travel document"] },
  { category: "electronics", tokens: ["charger", "usb", "cable", "power bank", "adapter", "camera", "lens", "memory card", "drone", "airtag", "airtags", "phone stand"] },
  { category: "health", tokens: ["sun cream", "sunscreen", "after sun", "plaster", "medicine", "medication", "prescription", "first aid"] },
  { category: "entertainment", tokens: ["toniebox", "tonies", "jellycat", "tablet", "headphones", "activity book", "films"] },
  { category: "cruise-extras", tokens: ["lanyard", "magnetic hook", "cruise"] },
  { category: "pet", tokens: ["dog lead", "dog towel", "dog bowl", "dog bed", "albert"] },
  { category: "clothing", tokens: ["sandals", "dress", "swim shorts", "swimsuit", "poncho", "shoes", "socks"] },
  { category: "travel-day", tokens: ["hand luggage", "day bag", "water bottle"] },
];

const SHARED_RULES = [
  "passport",
  "travel insurance",
  "sun cream",
  "first aid",
  "airtag",
  "airtags",
  "travel adapter",
  "boarding pass",
  "ticket",
  "plaster",
];

const ESSENTIAL_RULES = [
  "passport",
  "medication",
  "medicine",
  "travel document",
  "travel insurance",
  "ticket",
  "boarding pass",
  "wallet",
  "purse",
  "phone",
  "prescription",
];

export function buildBulkCaptureRows(
  parsedLines: BulkParsedLine[],
  context: BulkCaptureContext,
): BulkCaptureRow[] {
  const seenBatchKeys = new Map<string, BulkCaptureRow>();

  return parsedLines.map((parsed) => {
    const row = enrichParsedLine(parsed, context);
    const existingDuplicate = findExistingDuplicate(row, context.existingItems);
    const batchDuplicate = seenBatchKeys.get(createDuplicateKey(row));

    if (existingDuplicate) {
      row.duplicate = true;
      row.duplicateReason = `Matches existing item "${existingDuplicate.name}".`;
      row.included = false;
      row.warnings.push("Likely duplicate already in this trip.");
    } else if (batchDuplicate) {
      row.duplicate = true;
      row.duplicateReason = `Matches line ${batchDuplicate.lineNumber}.`;
      row.included = false;
      row.warnings.push("Likely duplicate in this pasted list.");
    } else {
      seenBatchKeys.set(createDuplicateKey(row), row);
    }

    return row;
  });
}

export function enrichParsedLine(
  parsed: BulkParsedLine,
  context: BulkCaptureContext,
): BulkCaptureRow {
  const warnings = [...parsed.warnings];
  const notes: string[] = [];
  let name = parsed.name;
  const corpusSuggestion = findBestPackingAutocompleteMatch(name, {
    categories: context.categories,
    existingItems: context.existingItems,
    quickAddContext: context.quickAddContext,
    travellers: context.travellers,
  });
  let ownershipScope: ItemOwnershipScope =
    context.quickAddContext?.ownershipScope ?? "unassigned";
  let ownerTravellerId = context.quickAddContext?.ownerTravellerId;
  let category =
    context.quickAddContext?.category ??
    corpusSuggestion?.resolvedCategory ??
    inferCategory(name, context.categories) ??
    "misc";
  let priority: PackingPriority =
    corpusSuggestion?.entry.priorityHint ?? inferPriority(name) ?? "important";
  let status: PackingStatus =
    parsed.status ??
    context.quickAddContext?.status ??
    corpusSuggestion?.entry.statusHint ??
    "needed";
  let bagId = context.quickAddContext?.bagId;

  if (parsed.ownerToken) {
    const owner = matchTravellerByToken(parsed.ownerToken, context.travellers);
    if (owner) {
      ownershipScope = "traveller";
      ownerTravellerId = owner.id;
    } else if (normaliseBulkToken(parsed.ownerToken) === "shared") {
      ownershipScope = "shared";
      ownerTravellerId = undefined;
    } else {
      ownershipScope = "unassigned";
      ownerTravellerId = undefined;
      warnings.push(`Unknown owner "${parsed.ownerToken}".`);
    }
  } else if (!context.quickAddContext?.ownershipScope || context.quickAddContext.ownershipScope === "unassigned") {
    if (corpusSuggestion?.resolvedOwnership) {
      ownershipScope = corpusSuggestion.resolvedOwnership.ownershipScope;
      ownerTravellerId = corpusSuggestion.resolvedOwnership.ownerTravellerId;
    }
    const inferredOwner = inferOwner(name, context.travellers);
    if (corpusSuggestion?.resolvedOwnership) {
      // Corpus owner hints are deliberately lower priority than explicit syntax and active context.
    } else if (inferredOwner === "shared") {
      ownershipScope = "shared";
      ownerTravellerId = undefined;
    } else if (inferredOwner) {
      ownershipScope = "traveller";
      ownerTravellerId = inferredOwner.id;
    }
  }

  for (const token of parsed.slashTokens) {
    const normalised = normaliseBulkToken(token);
    const tokenStatus = STATUS_TOKENS[normalised];
    if (tokenStatus) {
      status = tokenStatus;
      continue;
    }

    const tokenPriority = PRIORITY_TOKENS[normalised];
    if (tokenPriority) {
      priority = tokenPriority;
      continue;
    }

    const bag = matchBagByToken(token, context.bags);
    if (bag) {
      bagId = bag.id;
      continue;
    }

    const tokenCategory = matchCategoryByToken(token, context.categories);
    if (tokenCategory) {
      category = tokenCategory;
      continue;
    }

    notes.push(`Unresolved: ${token}`);
    warnings.push(`Unresolved metadata "${token}".`);
  }

  if (!context.categories.includes(category)) {
    category = context.categories.includes("misc") ? "misc" : category;
  }

  return {
    id: parsed.id,
    lineNumber: parsed.lineNumber,
    originalLine: parsed.originalLine,
    name,
    ownershipScope,
    ownerTravellerId: ownershipScope === "traveller" ? ownerTravellerId : undefined,
    category,
    quantity: parsed.quantity,
    priority,
    status,
    bagId,
    notes,
    warnings,
    duplicate: false,
    included: warnings.every((warning) => !warning.startsWith("Unknown owner") && !warning.startsWith("Invalid quantity") && !warning.startsWith("Enter an item name")),
  };
}

function inferCategory(name: string, categories: string[]) {
  const normalised = normaliseBulkToken(name);
  for (const rule of CATEGORY_RULES) {
    if (
      categories.includes(rule.category) &&
      rule.tokens.some((token) => normalised.includes(token))
    ) {
      return rule.category;
    }
  }
  return undefined;
}

function inferOwner(name: string, travellers: Traveller[]) {
  const normalised = normaliseBulkToken(name);
  const sharedFamily = travellers.find(
    (traveller) => normaliseBulkToken(traveller.name) === "shared family",
  );
  if (SHARED_RULES.some((token) => normalised.includes(token))) {
    return sharedFamily ?? "shared";
  }

  const namedRules: Record<string, string[]> = {
    albert: ["dog lead", "dog towel", "dog bowl", "dog bed", "albert"],
    beck: ["make up", "hair straighteners", "evening dress", "sandals"],
    phil: ["camera", "drone", "memory card", "power bank", "gadget", "usb c cable"],
    seb: ["toniebox", "tonies", "jellycat", "cuddly toy", "tablet headphones", "swim goggles"],
  };

  for (const [nameToken, itemTokens] of Object.entries(namedRules)) {
    if (itemTokens.some((token) => normalised.includes(token))) {
      return travellers.find((traveller) =>
        normaliseBulkToken(traveller.name).startsWith(nameToken),
      );
    }
  }

  return undefined;
}

function inferPriority(name: string): PackingPriority | undefined {
  const normalised = normaliseBulkToken(name);
  return ESSENTIAL_RULES.some((token) => normalised.includes(token))
    ? "essential"
    : undefined;
}
