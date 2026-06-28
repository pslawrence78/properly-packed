import type {
  PackingItem,
  PackingPriority,
  PackingStatus,
  Traveller,
  Trip,
} from "../../../db/types";
import type { QuickAddContextDefault } from "../packing-item-utils";

export type PackingAutocompleteOwnerHint =
  | "beck"
  | "phil"
  | "seb"
  | "shared-family"
  | "albert"
  | "adult"
  | "child"
  | "dog"
  | "shared";

export type PackingAutocompleteEntry = {
  id: string;
  name: string;
  aliases: string[];
  categoryHint?: string;
  ownerHint?: PackingAutocompleteOwnerHint;
  priorityHint?: PackingPriority;
  statusHint?: PackingStatus;
  flags?: string[];
  tripTypeHints?: Trip["tripType"][];
  contextHints?: string[];
  bagHints?: string[];
  notes?: string;
  familySpecific?: boolean;
};

export type PackingAutocompleteContext = {
  categories?: string[];
  existingItems?: PackingItem[];
  quickAddContext?: QuickAddContextDefault;
  travellers?: Traveller[];
  trip?: Pick<Trip, "tripType" | "activityContextIds" | "climateContextIds" | "transportContextIds" | "accommodationContextIds">;
};

export type ResolvedPackingAutocompleteSuggestion = {
  entry: PackingAutocompleteEntry;
  matchReason: string;
  duplicate: boolean;
  duplicateReason?: string;
  resolvedCategory?: string;
  resolvedOwnership?: {
    ownershipScope: PackingItem["ownershipScope"];
    ownerTravellerId?: string;
  };
  score: number;
};
