import type { PackingItemInput } from "../../db/repositories/packing-items-repository";
import type {
  Bag,
  ItemOwnershipScope,
  PackingItem,
  PackingPriority,
  PackingStatus,
  Traveller,
} from "../../db/types";
import type { QuickAddContextDefault } from "./packing-item-utils";

export type BulkCaptureContext = {
  bags: Bag[];
  categories: string[];
  existingItems: PackingItem[];
  quickAddContext?: QuickAddContextDefault;
  travellers: Traveller[];
  tripId: string;
};

export type BulkParsedLine = {
  id: string;
  lineNumber: number;
  originalLine: string;
  ownerToken?: string;
  name: string;
  quantity: number;
  slashTokens: string[];
  status?: PackingStatus;
  warnings: string[];
};

export type BulkCaptureRow = {
  id: string;
  lineNumber: number;
  originalLine: string;
  name: string;
  ownershipScope: ItemOwnershipScope;
  ownerTravellerId?: string;
  category: string;
  quantity: number;
  priority: PackingPriority;
  status: PackingStatus;
  bagId?: string;
  notes: string[];
  warnings: string[];
  duplicate: boolean;
  duplicateReason?: string;
  included: boolean;
};

export type BulkCaptureSummary = {
  parsedCount: number;
  readyCount: number;
  skippedCount: number;
  warningCount: number;
  duplicateCount: number;
};

export type BulkCommitPayload = PackingItemInput;
