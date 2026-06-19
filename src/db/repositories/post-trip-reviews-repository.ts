import type { ProperlyPackedDatabase } from "../schema";
import { appDb } from "../schema";
import type {
  PackingItem,
  PostTripReview,
  ReviewLearning,
  ReviewLearningType,
  TemplateItem,
  Trip,
  UsefulExtra,
} from "../types";
import { updateTrip } from "./trips-repository";

export type ReviewLearningInput = {
  itemName: string;
  learningType: ReviewLearningType;
  appliesToTripTypes: Trip["tripType"][];
  notes?: string;
};

export type ReviewSummary = {
  review: PostTripReview;
  learnings: ReviewLearning[];
};

export async function getOrCreatePostTripReview(
  tripId: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const existing = await db.postTripReviews.where("tripId").equals(tripId).first();

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const review: PostTripReview = {
    id: createId("post-trip-review"),
    tripId,
    createdAt: now,
    updatedAt: now,
  };

  await db.postTripReviews.add(review);
  return review;
}

export async function getPostTripReviewSummary(
  tripId: string,
  db: ProperlyPackedDatabase = appDb,
): Promise<ReviewSummary> {
  const review = await getOrCreatePostTripReview(tripId, db);
  const learnings = await listReviewLearnings(review.id, db);
  return { review, learnings };
}

export async function completePostTripReview(
  tripId: string,
  summary?: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const review = await getOrCreatePostTripReview(tripId, db);
  const now = new Date().toISOString();
  await db.postTripReviews.update(review.id, {
    completedAt: now,
    summary: summary?.trim() || undefined,
    updatedAt: now,
  });
  await updateTrip(tripId, { status: "completed" }, db);
  return db.postTripReviews.get(review.id);
}

export async function createReviewLearning(
  reviewId: string,
  input: ReviewLearningInput,
  db: ProperlyPackedDatabase = appDb,
) {
  const now = new Date().toISOString();
  const learning: ReviewLearning = {
    id: createId("review-learning"),
    reviewId,
    itemName: input.itemName.trim(),
    learningType: input.learningType,
    appliesToTripTypes: input.appliesToTripTypes,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  await db.reviewLearnings.add(learning);
  return learning;
}

export async function createLearningFromPackingItem(
  reviewId: string,
  item: PackingItem,
  learningType: ReviewLearningType,
  trip: Trip,
  db: ProperlyPackedDatabase = appDb,
) {
  return createReviewLearning(
    reviewId,
    {
      itemName: item.name,
      learningType,
      appliesToTripTypes: [trip.tripType],
      notes: item.notes,
    },
    db,
  );
}

export async function listReviewLearnings(
  reviewId: string,
  db: ProperlyPackedDatabase = appDb,
) {
  return db.reviewLearnings
    .where("reviewId")
    .equals(reviewId)
    .toArray()
    .then((learnings) =>
      learnings.sort((a, b) => a.itemName.localeCompare(b.itemName)),
    );
}

export async function markLearningAlwaysSuggest(
  learningId: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const learning = await requireLearning(learningId, db);
  await upsertUsefulExtraFromLearning(
    learning,
    {
      alwaysSuggest: true,
      neverSuggest: false,
      forgottenBefore: learning.learningType === "forgotten",
    },
    db,
  );
  return markLearningAction(learning.id, "always-suggest", db);
}

export async function markLearningNeverSuggest(
  learningId: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const learning = await requireLearning(learningId, db);
  await upsertUsefulExtraFromLearning(
    learning,
    {
      alwaysSuggest: false,
      neverSuggest: true,
      forgottenBefore: false,
    },
    db,
  );
  return markLearningAction(learning.id, "do-not-suggest-again", db);
}

export async function promoteLearningToUsefulExtra(
  learningId: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const learning = await requireLearning(learningId, db);
  await upsertUsefulExtraFromLearning(
    learning,
    {
      alwaysSuggest:
        learning.learningType === "forgotten" ||
        learning.learningType === "invaluable" ||
        learning.learningType === "buy-for-next-time",
      neverSuggest: false,
      forgottenBefore: learning.learningType === "forgotten",
    },
    db,
  );
  return markLearningAction(learning.id, "promoted-to-useful-extra", db);
}

export async function promoteLearningToTemplate(
  learningId: string,
  templateId: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const learning = await requireLearning(learningId, db);
  const template = templateId ? await db.templates.get(templateId) : undefined;

  if (!template?.active) {
    throw new Error("Choose an active template before promoting this learning.");
  }

  const now = new Date().toISOString();
  const templateItem: TemplateItem = {
    id: createId("template-item"),
    templateId: template.id,
    name: learning.itemName,
    ownerType: "shared",
    category: "misc",
    quantity: 1,
    priority:
      learning.learningType === "forgotten" ||
      learning.learningType === "buy-for-next-time"
        ? "important"
        : "useful",
    flags: ["post-trip-learning"],
    notes: learning.notes,
    conditionRules: [],
    createdAt: now,
    updatedAt: now,
  };

  await db.templateItems.add(templateItem);
  return markLearningAction(learning.id, "promoted-to-template", db);
}

export async function markLearningAction(
  learningId: string,
  actionTaken: string,
  db: ProperlyPackedDatabase = appDb,
) {
  await db.reviewLearnings.update(learningId, {
    actionTaken,
    updatedAt: new Date().toISOString(),
  });
  return db.reviewLearnings.get(learningId);
}

async function upsertUsefulExtraFromLearning(
  learning: ReviewLearning,
  flags: Pick<UsefulExtra, "alwaysSuggest" | "neverSuggest" | "forgottenBefore">,
  db: ProperlyPackedDatabase,
) {
  const now = new Date().toISOString();
  const seedKey = `post-trip-learning:${normaliseKey(learning.itemName)}`;
  const existing = await db.usefulExtras
    .toArray()
    .then((extras) => extras.find((extra) => extra.seedKey === seedKey));
  const usefulExtra: UsefulExtra = {
    id: existing?.id ?? createId("useful-extra"),
    seedKey,
    name: learning.itemName,
    category: categoryForLearning(learning.learningType),
    applicableTripTypes: learning.appliesToTripTypes,
    applicableContexts: [],
    defaultPriority:
      learning.learningType === "forgotten" ||
      learning.learningType === "buy-for-next-time"
        ? "important"
        : "useful",
    notes: learning.notes,
    alwaysSuggest: flags.alwaysSuggest,
    neverSuggest: flags.neverSuggest,
    forgottenBefore: flags.forgottenBefore,
    invaluableBefore: learning.learningType === "invaluable",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    userModifiedAt: now,
  };

  await db.usefulExtras.put(usefulExtra);
  return usefulExtra;
}

async function requireLearning(
  learningId: string,
  db: ProperlyPackedDatabase,
) {
  const learning = await db.reviewLearnings.get(learningId);

  if (!learning) {
    throw new Error("Review learning not found.");
  }

  return learning;
}

function categoryForLearning(learningType: ReviewLearningType) {
  if (learningType === "buy-for-next-time") {
    return "misc";
  }

  if (learningType === "packed-in-wrong-bag") {
    return "travel-day";
  }

  return "misc";
}

function normaliseKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }

  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
