import { afterEach, describe, expect, it } from "vitest";
import { ProperlyPackedDatabase } from "../db";
import {
  completePostTripReview,
  createReviewLearning,
  getOrCreatePostTripReview,
  markLearningAlwaysSuggest,
  markLearningNeverSuggest,
  promoteLearningToTemplate,
  promoteLearningToUsefulExtra,
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
  it("creates learnings and completes a trip review", async () => {
    const db = createTestDatabase();
    const trip = tripRow(["traveller:beck"]);
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

    await markLearningAlwaysSuggest(learning.id, db);
    await promoteLearningToTemplate(learning.id, trip, db);

    expect(await db.reviewLearnings.get(learning.id)).toMatchObject({
      actionTaken: "promoted-to-template",
    });
    expect((await db.templateItems.toArray()).map((item) => item.name)).toContain(
      "Formal shawl",
    );
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
    accommodationTypes: ["ship"],
    transportModes: ["ship"],
    activityContexts: ["cruise"],
    travellerIds,
    status: "travelling",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}
