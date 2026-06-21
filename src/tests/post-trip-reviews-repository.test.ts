import { afterEach, describe, expect, it } from "vitest";
import Dexie from "dexie";
import { ProperlyPackedDatabase } from "../db";
import {
  completePostTripReview,
  createReviewLearning,
  createLearningFromPackingItem,
  addLearningSuggestionToTrip,
  getOrCreatePostTripReview,
  markLearningAlwaysSuggest,
  markLearningNeverSuggest,
  removePostTripReview,
  reopenPostTripReview,
  promoteLearningToTemplate,
  promoteLearningToUsefulExtra,
  listLearningSuggestionsForTrip,
} from "../db/repositories/post-trip-reviews-repository";
import { listUsefulExtraSuggestionsForTrip } from "../db/repositories/useful-extras-repository";
import { applyInitialSeed } from "../db/seed";
import type { Traveller, Trip } from "../db/types";

const testDatabases: ProperlyPackedDatabase[] = [];

function createTestDatabase() {
  const db = new ProperlyPackedDatabase(`properly-packed-test-${crypto.randomUUID()}`);
  testDatabases.push(db);
  return db;
}

afterEach(async () => {
  await Promise.all(
    testDatabases.splice(0).map(async (db) => {
      db.close();
      await db.delete();
    }),
  );
});

describe("post-trip reviews repository", () => {
  it("migrates duplicate v4 reviews without losing their learnings", async () => {
    const name = `properly-packed-test-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(4).stores({
      postTripReviews: "id, tripId",
      reviewLearnings: "id, reviewId, learningType",
    });
    const now = "2026-06-16T00:00:00.000Z";
    await legacy.table("postTripReviews").bulkAdd([
      { id: "review:first", tripId: "trip:duplicate", createdAt: now, updatedAt: now },
      { id: "review:second", tripId: "trip:duplicate", summary: "Latest notes", completedAt: now, createdAt: "2026-06-17T00:00:00.000Z", updatedAt: "2026-06-17T00:00:00.000Z" },
    ]);
    await legacy.table("reviewLearnings").add({
      id: "learning:duplicate",
      reviewId: "review:second",
      itemName: "Cabin pegs",
      learningType: "forgotten",
      createdAt: now,
      updatedAt: now,
    });
    legacy.close();

    const db = new ProperlyPackedDatabase(name);
    testDatabases.push(db);
    await db.open();

    expect(await db.postTripReviews.where("tripId").equals("trip:duplicate").toArray()).toEqual([
      expect.objectContaining({ id: "review:first", status: "completed", summary: "Latest notes" }),
    ]);
    expect(await db.reviewLearnings.get("learning:duplicate")).toMatchObject({
      reviewId: "review:first",
      sourceTripId: "trip:duplicate",
      appliesToTripTypes: [],
    });
  });

  it("rejects missing trips and removes a review with all of its learnings", async () => {
    const db = createTestDatabase();
    await expect(getOrCreatePostTripReview("trip:missing", db)).rejects.toThrow("Trip not found");

    const trip = tripRow([], "trip:remove");
    await db.trips.add(trip);
    const review = await getOrCreatePostTripReview(trip.id, db);
    await createReviewLearning(review.id, {
      itemName: "Travel adaptor",
      learningType: "forgotten",
      appliesToTripTypes: [trip.tripType],
    }, db);

    await completePostTripReview(trip.id, undefined, db);
    await reopenPostTripReview(trip.id, db);
    expect(await db.postTripReviews.get(review.id)).toMatchObject({ status: "draft" });
    expect(await removePostTripReview(trip.id, db)).toBe(true);
    expect(await db.postTripReviews.get(review.id)).toBeUndefined();
    expect(await db.reviewLearnings.where("reviewId").equals(review.id).count()).toBe(0);
  });

  it("creates learnings and completes a trip review", async () => {
    const db = createTestDatabase();
    const trip = tripRow(["traveller:adult"]);
    await db.trips.add(trip);
    const review = await getOrCreatePostTripReview(trip.id, db);

    const learning = await createReviewLearning(
      review.id,
      {
        itemName: "Beach shoes",
        learningType: "forgotten",
        appliesToTripTypes: ["cruise"],
      },
      db,
    );
    await completePostTripReview(trip.id, "Good trip.", db);

    expect(learning).toMatchObject({
      itemName: "Beach shoes",
      learningType: "forgotten",
    });
    expect(await db.postTripReviews.get(review.id)).toMatchObject({
      summary: "Good trip.",
    });
    expect(await db.trips.get(trip.id)).toMatchObject({ status: "completed" });
  });

  it("promotes learnings into future useful extra suggestions", async () => {
    const db = createTestDatabase();
    await applyInitialSeed(db, () => "2026-06-16T00:00:00.000Z");
    const travellers = await db.travellers.toArray();
    const trip = tripRow(travellers.map((traveller) => traveller.id));
    await db.trips.add(trip);
    const review = await getOrCreatePostTripReview(trip.id, db);
    const learning = await createReviewLearning(
      review.id,
      {
        itemName: "Cabin pegs",
        learningType: "forgotten",
        appliesToTripTypes: ["cruise"],
      },
      db,
    );

    await promoteLearningToUsefulExtra(learning.id, db);
    const futureTrip = tripRow(travellers.map((traveller) => traveller.id), "trip:future");
    const suggestions = await listUsefulExtraSuggestionsForTrip(
      futureTrip,
      travellers,
      db,
    );

    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extra: expect.objectContaining({
            name: "Cabin pegs",
            alwaysSuggest: true,
            forgottenBefore: true,
          }),
          status: "new",
        }),
      ]),
    );
  });

  it("suppresses future suggestions through never-suggest", async () => {
    const db = createTestDatabase();
    await applyInitialSeed(db, () => "2026-06-16T00:00:00.000Z");
    const travellers = await db.travellers.toArray();
    const trip = tripRow(travellers.map((traveller) => traveller.id));
    await db.trips.add(trip);
    const review = await getOrCreatePostTripReview(trip.id, db);
    const learning = await createReviewLearning(
      review.id,
      {
        itemName: "Novelty towel clips",
        learningType: "unused",
        appliesToTripTypes: ["cruise"],
      },
      db,
    );

    await markLearningNeverSuggest(learning.id, db);
    const suggestions = await listUsefulExtraSuggestionsForTrip(trip, travellers, db);
    const suggestion = suggestions.find(
      (candidate) => candidate.extra.name === "Novelty towel clips",
    );

    expect(suggestion).toMatchObject({ status: "hidden" });
  });

  it("marks always-suggest and promotes to template", async () => {
    const db = createTestDatabase();
    await applyInitialSeed(db, () => "2026-06-16T00:00:00.000Z");
    const trip = tripRow(["traveller:beck"]);
    await db.trips.add(trip);
    const review = await getOrCreatePostTripReview(trip.id, db);
    const learning = await createReviewLearning(
      review.id,
      {
        itemName: "Formal shawl",
        learningType: "invaluable",
        appliesToTripTypes: ["cruise"],
      },
      db,
    );
    const targetTemplate = (await db.templates.toArray()).find(
      (template) => template.active,
    );
    if (!targetTemplate) throw new Error("Expected an active template fixture.");

    await markLearningAlwaysSuggest(learning.id, db);
    const itemCountBeforeBlockedPromotion = await db.templateItems.count();
    await expect(promoteLearningToTemplate(learning.id, "", db)).rejects.toThrow(
      "Choose an active template",
    );
    expect(await db.templateItems.count()).toBe(itemCountBeforeBlockedPromotion);

    await promoteLearningToTemplate(learning.id, targetTemplate.id, db);

    expect(await db.reviewLearnings.get(learning.id)).toMatchObject({
      actionTaken: "promoted-to-template",
    });
    expect(await db.templateItems.where("templateId").equals(targetTemplate.id).toArray()).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Formal shawl" })]),
    );
  });

  it("preserves source and wrong-bag snapshots", async () => {
    const db = createTestDatabase();
    const trip = tripRow([], "trip:bags");
    await db.trips.add(trip);
    const now = "2026-06-16T00:00:00.000Z";
    const originalBag = { id: "bag:case", tripId: trip.id, name: "Main case", bagType: "suitcase" as const, isHandLuggage: false, isTravelDay: false, isCruiseEmbarkation: false, createdAt: now, updatedAt: now };
    const betterBag = { ...originalBag, id: "bag:cabin", name: "Cabin bag", bagType: "cabin-bag" as const, isHandLuggage: true };
    await db.bags.bulkAdd([originalBag, betterBag]);
    const item = { id: "item:charger", tripId: trip.id, name: "Phone charger", ownershipScope: "shared" as const, category: "gadgets", quantity: 1, priority: "important" as const, status: "packed" as const, bagId: originalBag.id, flags: [], dependencyItemIds: [], source: "manual" as const, forgottenRisk: false, createdAt: now, updatedAt: now };
    await db.packingItems.add(item);
    const review = await getOrCreatePostTripReview(trip.id, db);

    const learning = await createLearningFromPackingItem(review.id, item, "packed-in-wrong-bag", trip, db, betterBag);

    expect(learning).toMatchObject({ sourceTripId: trip.id, sourcePackingItemId: item.id, originalBagName: "Main case", suggestedBagName: "Cabin bag" });
  });

  it("surfaces matching learning explicitly and adds buy-next-time as to-buy", async () => {
    const db = createTestDatabase();
    const sourceTrip = tripRow([], "trip:source");
    const futureTrip = tripRow([], "trip:future");
    await db.trips.bulkAdd([sourceTrip, futureTrip]);
    const review = await getOrCreatePostTripReview(sourceTrip.id, db);
    const learning = await createReviewLearning(review.id, { itemName: "Reef shoes", category: "footwear", learningType: "buy-for-next-time", appliesToTripTypes: ["cruise"] }, db);

    const suggestions = await listLearningSuggestionsForTrip(futureTrip, db);
    expect(suggestions).toEqual([expect.objectContaining({ learning: expect.objectContaining({ itemName: "Reef shoes" }), packingStatus: "to-buy", status: "new" })]);

    await addLearningSuggestionToTrip(learning.id, futureTrip, db);
    expect(await db.packingItems.where("tripId").equals(futureTrip.id).first()).toMatchObject({ name: "Reef shoes", status: "to-buy", source: "post-trip-learning" });

    const unrelated = { ...futureTrip, id: "trip:city", tripType: "city-break" as const };
    expect(await listLearningSuggestionsForTrip(unrelated, db)).toEqual([]);
  });
});

function tripRow(
  travellerIds: Traveller["id"][],
  id = "trip:review",
): Trip {
  return {
    id,
    name: "Review trip",
    tripType: "cruise",
    startDate: "2026-08-01",
    endDate: "2026-08-08",
    nights: 7,
    destinations: ["Southampton"],
    climateContextIds: [],
    accommodationContextIds: [],
    transportContextIds: [],
    activityContextIds: [],
    accommodationTypes: ["ship"],
    transportModes: ["ship"],
    activityContexts: ["cruise"],
    travellerIds,
    status: "travelling",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}
