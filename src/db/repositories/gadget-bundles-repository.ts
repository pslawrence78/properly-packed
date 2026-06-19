import type { ProperlyPackedDatabase } from "../schema";
import { appDb } from "../schema";
import { tripMatchesContext } from "../trip-context-matching";
import type {
  GadgetBundle,
  GadgetBundleItem,
  PackingItem,
  PreTripTask,
  Traveller,
  Trip,
} from "../types";
import { hasDuplicatePackingItem } from "./templates-repository";

export type GadgetBundleSuggestion = {
  bundleItem: GadgetBundleItem;
  status: "new" | "duplicate";
  optional: boolean;
};

export type GadgetBundlePreview = {
  bundle: GadgetBundle;
  ownerTraveller?: Traveller;
  suggestions: GadgetBundleSuggestion[];
  requiredCount: number;
  optionalCount: number;
  duplicateCount: number;
};

export type ApplyGadgetBundleInput = {
  bundleId: string;
  trip: Trip;
  travellers: Traveller[];
  ownerTravellerId: string;
  optionalItemIds?: string[];
};

export type ApplyGadgetBundleResult = {
  insertedItems: number;
  createdTasks: number;
  skippedDuplicates: number;
};

export type MissingDependencyWarning = {
  item: PackingItem;
  dependencyNotes: string;
};

export async function listGadgetBundles(db: ProperlyPackedDatabase = appDb) {
  const bundles = await db.gadgetBundles.toArray();
  return bundles
    .filter((bundle) => !bundle.archivedAt)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listGadgetBundleItems(
  bundleId: string,
  db: ProperlyPackedDatabase = appDb,
) {
  return db.gadgetBundleItems.where("bundleId").equals(bundleId).sortBy("name");
}

export async function previewGadgetBundlesForTrip(
  trip: Trip,
  travellers: Traveller[],
  db: ProperlyPackedDatabase = appDb,
) {
  const [bundles, bundleItems, existingItems, contextOptions] = await Promise.all([
    listGadgetBundles(db),
    db.gadgetBundleItems.toArray(),
    db.packingItems.where("tripId").equals(trip.id).toArray(),
    db.contextOptions.toArray(),
  ]);

  return bundles
    .filter((bundle) => gadgetBundleAppliesToTrip(bundle, trip, contextOptions))
    .map((bundle) =>
      buildGadgetBundlePreview(
        bundle,
        bundleItems.filter((item) => item.bundleId === bundle.id),
        trip,
        travellers,
        existingItems,
      ),
    )
    .sort((a, b) => b.requiredCount - a.requiredCount || a.bundle.name.localeCompare(b.bundle.name));
}

export async function previewGadgetBundleForTrip(
  bundleId: string,
  trip: Trip,
  travellers: Traveller[],
  ownerTravellerId?: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const bundle = await db.gadgetBundles.get(bundleId);

  if (!bundle) {
    throw new Error("Gadget bundle not found.");
  }

  const [bundleItems, existingItems] = await Promise.all([
    listGadgetBundleItems(bundle.id, db),
    db.packingItems.where("tripId").equals(trip.id).toArray(),
  ]);

  return buildGadgetBundlePreview(
    bundle,
    bundleItems,
    trip,
    travellers,
    existingItems,
    ownerTravellerId,
  );
}

export async function applyGadgetBundleToTrip(
  input: ApplyGadgetBundleInput,
  db: ProperlyPackedDatabase = appDb,
): Promise<ApplyGadgetBundleResult> {
  const optionalItemIds = new Set(input.optionalItemIds ?? []);
  const preview = await previewGadgetBundleForTrip(
    input.bundleId,
    input.trip,
    input.travellers,
    input.ownerTravellerId,
    db,
  );

  if (!preview.ownerTraveller) {
    throw new Error("Choose who this gadget bundle is for.");
  }

  const selectedSuggestions = preview.suggestions.filter(
    (suggestion) =>
      suggestion.status === "new" &&
      (!suggestion.optional || optionalItemIds.has(suggestion.bundleItem.id)),
  );
  const now = new Date().toISOString();
  const packingItems: PackingItem[] = selectedSuggestions.map((suggestion) => ({
    id: createId("packing-item"),
    tripId: input.trip.id,
    name: suggestion.bundleItem.name,
    ownershipScope: "traveller",
    ownerTravellerId: preview.ownerTraveller!.id,
    category: suggestion.bundleItem.category,
    quantity: suggestion.bundleItem.quantity,
    priority: suggestion.bundleItem.required ? "important" : "useful",
    status: statusForBundleItem(suggestion.bundleItem),
    flags: [...suggestion.bundleItem.flags],
    dependencyItemIds: [],
    source: "gadget-bundle",
    sourceId: suggestion.bundleItem.id,
    notes: suggestion.bundleItem.dependencyNotes,
    forgottenRisk: false,
    createdAt: now,
    updatedAt: now,
  }));

  const tasks: PreTripTask[] = [];

  for (const item of packingItems) {
    const bundleItem = selectedSuggestions.find(
      (suggestion) => suggestion.bundleItem.id === item.sourceId,
    )?.bundleItem;

    if (!bundleItem?.preTripTaskType) {
      continue;
    }

    tasks.push({
      id: createId("pre-trip-task"),
      tripId: input.trip.id,
      relatedItemId: item.id,
      relatedBundleId: preview.bundle.id,
      taskName: taskNameForBundleItem(bundleItem),
      taskType: bundleItem.preTripTaskType,
      ownerTravellerId: preview.ownerTraveller!.id,
      status: "open",
      dueTiming:
        bundleItem.preTripTaskType === "download" ? "week-before" : "day-before",
      createdAt: now,
      updatedAt: now,
    });
  }

  await db.transaction("rw", [db.packingItems, db.preTripTasks], async () => {
    if (packingItems.length > 0) {
      await db.packingItems.bulkAdd(packingItems);
    }

    if (tasks.length > 0) {
      await db.preTripTasks.bulkAdd(tasks);
    }
  });

  return {
    insertedItems: packingItems.length,
    createdTasks: tasks.length,
    skippedDuplicates: preview.duplicateCount,
  };
}

export function buildGadgetBundlePreview(
  bundle: GadgetBundle,
  bundleItems: GadgetBundleItem[],
  trip: Trip,
  travellers: Traveller[],
  existingItems: PackingItem[],
  ownerTravellerId = bundle.ownerTravellerId,
): GadgetBundlePreview {
  const ownerTraveller = resolveBundleOwner(ownerTravellerId, trip, travellers);
  const suggestions = bundleItems.map((bundleItem): GadgetBundleSuggestion => {
    const duplicate =
      ownerTraveller &&
      hasDuplicatePackingItem(
        existingItems,
        bundleItem.name,
        "traveller",
        ownerTraveller.id,
      );

    return {
      bundleItem,
      optional: !bundleItem.required,
      status: duplicate ? "duplicate" : "new",
    };
  });

  return {
    bundle,
    ownerTraveller,
    suggestions,
    requiredCount: suggestions.filter((suggestion) => !suggestion.optional).length,
    optionalCount: suggestions.filter((suggestion) => suggestion.optional).length,
    duplicateCount: suggestions.filter((suggestion) => suggestion.status === "duplicate")
      .length,
  };
}

export function gadgetBundleAppliesToTrip(
  bundle: GadgetBundle,
  trip: Trip,
  contextOptions: import("../types").ContextOption[] = [],
) {
  const tripTypeMatch =
    bundle.applicableTripTypes.length === 0 ||
    bundle.applicableTripTypes.includes(trip.tripType);
  const contextMatch =
    bundle.applicableContexts.length === 0 ||
    bundle.applicableContexts.some((context) =>
      tripMatchesContext(trip, context, contextOptions),
    );

  return tripTypeMatch && contextMatch;
}

export function listItemsToCharge(items: PackingItem[]) {
  return items.filter(
    (item) =>
      !item.archivedAt &&
      (item.status === "to-charge" || item.flags.includes("battery")),
  );
}

export function listItemsToDownload(items: PackingItem[]) {
  return items.filter(
    (item) =>
      !item.archivedAt &&
      (item.status === "to-download" || item.flags.includes("download")),
  );
}

export function findMissingDependencies(items: PackingItem[]): MissingDependencyWarning[] {
  return items
    .filter((item) => !item.archivedAt && item.notes?.toLocaleLowerCase().includes("needs "))
    .filter((item) => !dependencyAppearsPresent(item.notes ?? "", items))
    .map((item) => ({
      item,
      dependencyNotes: item.notes ?? "",
    }));
}

function dependencyAppearsPresent(notes: string, items: PackingItem[]) {
  const dependencyName = notes
    .replace(/^needs\s+/i, "")
    .replace(/[.]+$/g, "")
    .trim()
    .toLocaleLowerCase();

  if (!dependencyName) {
    return true;
  }

  return items.some(
    (item) =>
      !item.archivedAt &&
      item.name.toLocaleLowerCase().includes(dependencyName.replace(/^a\s+/, "")),
  );
}

function resolveBundleOwner(
  ownerTravellerId: string | undefined,
  trip: Trip,
  travellers: Traveller[],
) {
  if (!ownerTravellerId || !trip.travellerIds.includes(ownerTravellerId)) {
    return undefined;
  }

  return travellers.find((traveller) => traveller.id === ownerTravellerId);
}

function statusForBundleItem(bundleItem: GadgetBundleItem): PackingItem["status"] {
  if (bundleItem.preTripTaskType === "charge") {
    return "to-charge";
  }

  if (bundleItem.preTripTaskType === "download") {
    return "to-download";
  }

  if (bundleItem.preTripTaskType === "check") {
    return "to-decide";
  }

  return "needed";
}

function taskNameForBundleItem(bundleItem: GadgetBundleItem) {
  if (bundleItem.preTripTaskType === "charge") {
    return `Charge ${bundleItem.name}`;
  }

  if (bundleItem.preTripTaskType === "download") {
    return `Download ${bundleItem.name}`;
  }

  if (bundleItem.preTripTaskType === "check") {
    return `Check ${bundleItem.name}`;
  }

  return `Pack ${bundleItem.name}`;
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }

  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
