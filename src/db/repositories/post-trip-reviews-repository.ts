import type { ProperlyPackedDatabase } from "../schema";
import { appDb } from "../schema";
import type {
  Bag,
  PackingItem,
  PackingStatus,
  PostTripReview,
  ReviewLearning,
  ReviewLearningType,
  TemplateItem,
  Trip,
  UsefulExtra,
} from "../types";
import { hasDuplicatePackingItem } from "./templates-repository";
import { updateTrip } from "./trips-repository";

export type ReviewLearningInput = {
  sourceTripId?: string;
  sourcePackingItemId?: string;
  itemName: string;
  learningType: ReviewLearningType;
  appliesToTripTypes: Trip["tripType"][];
  category?: string;
  ownerTravellerId?: string;
  originalBagId?: string;
  originalBagName?: string;
  suggestedBagId?: string;
  suggestedBagName?: string;
  notes?: string;
};

export type ReviewSummary = { review: PostTripReview; learnings: ReviewLearning[] };
export type ReviewLearningSuggestion = {
  learning: ReviewLearning;
  status: "new" | "duplicate";
  packingStatus: PackingStatus;
  reason: string;
};

const POSITIVE_TYPES: ReviewLearningType[] = [
  "forgotten",
  "invaluable",
  "buy-for-next-time",
  "always-suggest",
];

export async function getOrCreatePostTripReview(
  tripId: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const existing = await db.postTripReviews.where("tripId").equals(tripId).first();
  if (existing) return { ...existing, status: existing.status ?? (existing.completedAt ? "completed" : "draft") };
  const now = new Date().toISOString();
  const review: PostTripReview = {
    id: createId("post-trip-review"), tripId, status: "draft", createdAt: now, updatedAt: now,
  };
  await db.postTripReviews.add(review);
  return review;
}

export async function getPostTripReviewSummary(tripId: string, db: ProperlyPackedDatabase = appDb): Promise<ReviewSummary> {
  const review = await getOrCreatePostTripReview(tripId, db);
  return { review, learnings: await listReviewLearnings(review.id, db) };
}

export async function savePostTripReviewSummary(tripId: string, summary?: string, db: ProperlyPackedDatabase = appDb) {
  const review = await getOrCreatePostTripReview(tripId, db);
  await db.postTripReviews.update(review.id, { summary: clean(summary), updatedAt: new Date().toISOString() });
  return db.postTripReviews.get(review.id);
}

export async function completePostTripReview(tripId: string, summary?: string, db: ProperlyPackedDatabase = appDb) {
  const review = await getOrCreatePostTripReview(tripId, db);
  const now = new Date().toISOString();
  await db.postTripReviews.update(review.id, { status: "completed", completedAt: now, summary: clean(summary), updatedAt: now });
  await updateTrip(tripId, { status: "completed" }, db);
  return db.postTripReviews.get(review.id);
}

export async function reopenPostTripReview(tripId: string, db: ProperlyPackedDatabase = appDb) {
  const review = await getOrCreatePostTripReview(tripId, db);
  await db.postTripReviews.update(review.id, { status: "draft", completedAt: undefined, updatedAt: new Date().toISOString() });
  return db.postTripReviews.get(review.id);
}

export async function createReviewLearning(reviewId: string, input: ReviewLearningInput, db: ProperlyPackedDatabase = appDb) {
  const review = await db.postTripReviews.get(reviewId);
  if (!review) throw new Error("Post-trip review not found.");
  const itemName = input.itemName.trim();
  if (!itemName) throw new Error("Item name is required.");
  const now = new Date().toISOString();
  const learning: ReviewLearning = {
    id: createId("review-learning"), reviewId,
    sourceTripId: input.sourceTripId ?? review.tripId,
    sourcePackingItemId: input.sourcePackingItemId,
    itemName, learningType: input.learningType,
    appliesToTripTypes: [...new Set(input.appliesToTripTypes)],
    category: clean(input.category), ownerTravellerId: input.ownerTravellerId,
    originalBagId: input.originalBagId, originalBagName: clean(input.originalBagName),
    suggestedBagId: input.suggestedBagId, suggestedBagName: clean(input.suggestedBagName),
    notes: clean(input.notes), createdAt: now, updatedAt: now,
  };
  await db.reviewLearnings.add(learning);
  return learning;
}

export async function createLearningFromPackingItem(reviewId: string, item: PackingItem, learningType: ReviewLearningType, trip: Trip, db: ProperlyPackedDatabase = appDb, suggestedBag?: Bag) {
  const originalBag = item.bagId ? await db.bags.get(item.bagId) : undefined;
  return createReviewLearning(reviewId, {
    sourceTripId: trip.id, sourcePackingItemId: item.id, itemName: item.name,
    learningType, appliesToTripTypes: [trip.tripType], category: item.category,
    ownerTravellerId: item.ownerTravellerId, originalBagId: item.bagId,
    originalBagName: originalBag?.name, suggestedBagId: suggestedBag?.id,
    suggestedBagName: suggestedBag?.name, notes: item.notes,
  }, db);
}

export async function listReviewLearnings(reviewId: string, db: ProperlyPackedDatabase = appDb) {
  return db.reviewLearnings.where("reviewId").equals(reviewId).toArray().then((rows) =>
    rows.filter((row) => !row.archivedAt).sort((a, b) => a.learningType.localeCompare(b.learningType) || a.itemName.localeCompare(b.itemName)),
  );
}

export async function updateReviewLearning(learningId: string, updates: Pick<ReviewLearning, "notes"> & Partial<Pick<ReviewLearning, "suggestedBagId" | "suggestedBagName">>, db: ProperlyPackedDatabase = appDb) {
  await requireLearning(learningId, db);
  await db.reviewLearnings.update(learningId, { ...updates, notes: clean(updates.notes), updatedAt: new Date().toISOString() });
  return db.reviewLearnings.get(learningId);
}

export async function archiveReviewLearning(learningId: string, db: ProperlyPackedDatabase = appDb) {
  await requireLearning(learningId, db);
  const now = new Date().toISOString();
  await db.reviewLearnings.update(learningId, { archivedAt: now, updatedAt: now });
}

export async function listLearningSuggestionsForTrip(trip: Trip, db: ProperlyPackedDatabase = appDb): Promise<ReviewLearningSuggestion[]> {
  const [learnings, existing] = await Promise.all([
    db.reviewLearnings.where("appliesToTripTypes").equals(trip.tripType).toArray(),
    db.packingItems.where("tripId").equals(trip.id).toArray(),
  ]);
  const suppressed = new Set(learnings.filter((l) => !l.archivedAt && l.learningType === "do-not-suggest-again").map((l) => normaliseName(l.itemName)));
  const seen = new Set<string>();
  return learnings
    .filter((l) => !l.archivedAt && POSITIVE_TYPES.includes(l.learningType) && !suppressed.has(normaliseName(l.itemName)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter((l) => { const key = normaliseName(l.itemName); if (seen.has(key)) return false; seen.add(key); return true; })
    .map((learning) => ({
      learning,
      status: hasDuplicatePackingItem(existing, learning.itemName, learning.ownerTravellerId ? "traveller" : "shared", learning.ownerTravellerId, learning.category) ? "duplicate" : "new",
      packingStatus: learning.learningType === "buy-for-next-time" ? "to-buy" : "needed",
      reason: learning.learningType === "buy-for-next-time" ? "Learnt from a previous trip · buy before travelling." : "Learnt from a previous similar trip.",
    }));
}

export async function listSuppressedLearningNames(tripType: Trip["tripType"], db: ProperlyPackedDatabase = appDb) {
  const learnings = await db.reviewLearnings.where("appliesToTripTypes").equals(tripType).toArray();
  return new Set(learnings.filter((l) => !l.archivedAt && l.learningType === "do-not-suggest-again").map((l) => normaliseName(l.itemName)));
}

export async function addLearningSuggestionToTrip(learningId: string, trip: Trip, db: ProperlyPackedDatabase = appDb) {
  const learning = await requireLearning(learningId, db);
  if (learning.archivedAt || !learning.appliesToTripTypes.includes(trip.tripType)) throw new Error("This learning does not apply to this trip.");
  const suppressed = await listSuppressedLearningNames(trip.tripType, db);
  if (suppressed.has(normaliseName(learning.itemName))) return { inserted: false, reason: "Suppressed for this trip type." };
  const existing = await db.packingItems.where("tripId").equals(trip.id).toArray();
  const scope = learning.ownerTravellerId && trip.travellerIds.includes(learning.ownerTravellerId) ? "traveller" : "shared";
  if (hasDuplicatePackingItem(existing, learning.itemName, scope, scope === "traveller" ? learning.ownerTravellerId : undefined, learning.category)) return { inserted: false, reason: "Already on this packing list." };
  const now = new Date().toISOString();
  await db.packingItems.add({
    id: createId("packing-item"), tripId: trip.id, name: learning.itemName,
    ownershipScope: scope, ownerTravellerId: scope === "traveller" ? learning.ownerTravellerId : undefined,
    category: learning.category ?? "misc", quantity: 1,
    priority: learning.learningType === "forgotten" || learning.learningType === "buy-for-next-time" ? "important" : "useful",
    status: learning.learningType === "buy-for-next-time" ? "to-buy" : "needed",
    flags: ["learnt-from-previous-trip"], dependencyItemIds: [], source: "post-trip-learning", sourceId: learning.id,
    notes: learning.notes ?? "Learnt from a previous similar trip.", forgottenRisk: learning.learningType === "forgotten",
    alwaysSuggest: learning.learningType === "always-suggest", createdAt: now, updatedAt: now,
  });
  return { inserted: true };
}

export async function markLearningAlwaysSuggest(id: string, db: ProperlyPackedDatabase = appDb) { const l = await requireLearning(id, db); await upsertUsefulExtraFromLearning(l, { alwaysSuggest: true, neverSuggest: false, forgottenBefore: l.learningType === "forgotten" }, db); return markLearningAction(id, "always-suggest", db); }
export async function markLearningNeverSuggest(id: string, db: ProperlyPackedDatabase = appDb) { const l = await requireLearning(id, db); await upsertUsefulExtraFromLearning(l, { alwaysSuggest: false, neverSuggest: true, forgottenBefore: false }, db); return markLearningAction(id, "do-not-suggest-again", db); }
export async function promoteLearningToUsefulExtra(id: string, db: ProperlyPackedDatabase = appDb) { const l = await requireLearning(id, db); await upsertUsefulExtraFromLearning(l, { alwaysSuggest: ["forgotten", "invaluable", "buy-for-next-time", "always-suggest"].includes(l.learningType), neverSuggest: false, forgottenBefore: l.learningType === "forgotten" }, db); return markLearningAction(id, "promoted-to-useful-extra", db); }

export async function promoteLearningToTemplate(id: string, templateId: string, db: ProperlyPackedDatabase = appDb) {
  const learning = await requireLearning(id, db); const template = templateId ? await db.templates.get(templateId) : undefined;
  if (!template?.active) throw new Error("Choose an active template before promoting this learning.");
  const duplicate = (await db.templateItems.where("templateId").equals(template.id).toArray()).find((item) => normaliseName(item.name) === normaliseName(learning.itemName));
  if (!duplicate) {
    const now = new Date().toISOString();
    const item: TemplateItem = { id: createId("template-item"), templateId: template.id, name: learning.itemName, ownerType: "shared", category: learning.category ?? "misc", quantity: 1, priority: learning.learningType === "forgotten" || learning.learningType === "buy-for-next-time" ? "important" : "useful", flags: ["post-trip-learning"], notes: learning.notes, conditionRules: [], createdAt: now, updatedAt: now };
    await db.templateItems.add(item);
  }
  return markLearningAction(id, duplicate ? "template-already-contained-item" : "promoted-to-template", db);
}

export async function markLearningAction(id: string, actionTaken: string, db: ProperlyPackedDatabase = appDb) { await db.reviewLearnings.update(id, { actionTaken, updatedAt: new Date().toISOString() }); return db.reviewLearnings.get(id); }

async function upsertUsefulExtraFromLearning(learning: ReviewLearning, flags: Pick<UsefulExtra, "alwaysSuggest" | "neverSuggest" | "forgottenBefore">, db: ProperlyPackedDatabase) {
  const now = new Date().toISOString();
  const existing = (await db.usefulExtras.toArray()).find((extra) => normaliseName(extra.name) === normaliseName(learning.itemName) && (extra.category === (learning.category ?? "misc") || !learning.category));
  const extra: UsefulExtra = {
    id: existing?.id ?? createId("useful-extra"), seedKey: existing?.seedKey, name: learning.itemName,
    category: learning.category ?? existing?.category ?? "misc",
    applicableTripTypes: [...new Set([...(existing?.applicableTripTypes ?? []), ...learning.appliesToTripTypes])], applicableContexts: existing?.applicableContexts ?? [],
    defaultPriority: learning.learningType === "forgotten" || learning.learningType === "buy-for-next-time" ? "important" : (existing?.defaultPriority ?? "useful"),
    notes: learning.notes ?? existing?.notes, alwaysSuggest: flags.alwaysSuggest || Boolean(existing?.alwaysSuggest), neverSuggest: flags.neverSuggest,
    forgottenBefore: flags.forgottenBefore || Boolean(existing?.forgottenBefore), invaluableBefore: learning.learningType === "invaluable" || Boolean(existing?.invaluableBefore),
    createdAt: existing?.createdAt ?? now, updatedAt: now, userModifiedAt: now,
  };
  await db.usefulExtras.put(extra); return extra;
}

async function requireLearning(id: string, db: ProperlyPackedDatabase) { const learning = await db.reviewLearnings.get(id); if (!learning) throw new Error("Review learning not found."); return learning; }
export function normaliseReviewItemName(value: string) { return normaliseName(value); }
function normaliseName(value: string) { return value.trim().toLocaleLowerCase().replace(/\s+/g, " "); }
function clean(value?: string) { const result = value?.trim(); return result || undefined; }
function createId(prefix: string) { return typeof crypto !== "undefined" && "randomUUID" in crypto ? `${prefix}:${crypto.randomUUID()}` : `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`; }
