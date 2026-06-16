import { NotebookPen } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ensureDatabaseReady } from "../../db";
import { listPackingItemsForTrip } from "../../db/repositories/packing-items-repository";
import {
  completePostTripReview,
  createLearningFromPackingItem,
  createReviewLearning,
  getPostTripReviewSummary,
  markLearningAlwaysSuggest,
  markLearningNeverSuggest,
  promoteLearningToTemplate,
  promoteLearningToUsefulExtra,
} from "../../db/repositories/post-trip-reviews-repository";
import { getTrip, updateTrip } from "../../db/repositories/trips-repository";
import type { PackingItem, ReviewLearning, ReviewLearningType, Trip } from "../../db/types";
import { PageSection } from "../../components/layout/PageSection";
import { useAsyncData } from "../../hooks/use-async-data";
import { reviewLearningOptions } from "./review-utils";

export function PostTripReviewScreen() {
  const { tripId } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState("");
  const [manualValues, setManualValues] = useState({
    itemName: "",
    learningType: "forgotten" as ReviewLearningType,
    notes: "",
  });
  const [summary, setSummary] = useState("");

  const reviewData = useAsyncData(async () => {
    await ensureDatabaseReady();

    if (!tripId) {
      throw new Error("Trip not found.");
    }

    const [trip, packingItems] = await Promise.all([
      getTrip(tripId),
      listPackingItemsForTrip(tripId),
    ]);

    if (!trip) {
      throw new Error("Trip not found.");
    }

    const reviewSummary = await getPostTripReviewSummary(trip.id);
    return { trip, packingItems, ...reviewSummary };
  }, [tripId, refreshKey]);

  async function refreshAfter(action: Promise<unknown>, success: string) {
    setMessage("");
    await action;
    setMessage(success);
    setRefreshKey((key) => key + 1);
  }

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (reviewData.state !== "ready" || !manualValues.itemName.trim()) {
      return;
    }

    await refreshAfter(
      createReviewLearning(reviewData.data.review.id, {
        itemName: manualValues.itemName,
        learningType: manualValues.learningType,
        appliesToTripTypes: [reviewData.data.trip.tripType],
        notes: manualValues.notes || undefined,
      }),
      "Learning captured.",
    );
    setManualValues({ itemName: "", learningType: "forgotten", notes: "" });
  }

  async function confirmed(action: Promise<unknown>, success: string, prompt: string) {
    if (!window.confirm(prompt)) {
      return;
    }

    await refreshAfter(action, success);
  }

  return (
    <section className="space-y-5">
      {reviewData.state === "loading" ? (
        <ReviewStatus message="Loading post-trip review..." />
      ) : null}
      {reviewData.state === "error" ? (
        <ReviewStatus message={reviewData.error} />
      ) : null}
      {reviewData.state === "ready" ? (
        <>
          <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
            <p className="inline-flex items-center gap-2 rounded-full bg-coralSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-coral">
              <NotebookPen aria-hidden="true" className="h-4 w-4" />
              Post-Trip Review
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
                  {reviewData.data.trip.name}
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
                  Capture forgotten, unused and invaluable items so future trips
                  get smarter.
                </p>
                {reviewData.data.review.completedAt ? (
                  <p className="mt-2 text-sm font-semibold text-teal">
                    Review completed {reviewData.data.review.completedAt}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="trip-action"
                  onClick={() =>
                    refreshAfter(
                      updateTrip(reviewData.data.trip.id, { status: "completed" }),
                      "Trip marked completed.",
                    )
                  }
                  type="button"
                >
                  Mark trip completed
                </button>
                <Link className="trip-action" to={`/trips/${reviewData.data.trip.id}`}>
                  Trip overview
                </Link>
              </div>
            </div>
          </div>

          {message ? (
            <div className="rounded-lg border border-teal/30 bg-teal/10 px-4 py-3 text-sm text-charcoal/78">
              {message}
            </div>
          ) : null}

          <PageSection title="Review items">
            {reviewData.data.packingItems.length === 0 ? (
              <p className="text-sm text-charcoal/65">No packing items to review yet.</p>
            ) : (
              <div className="grid gap-3">
                {reviewData.data.packingItems.map((item) => (
                  <ReviewItemRow
                    item={item}
                    key={item.id}
                    trip={reviewData.data.trip}
                    onCapture={(learningType) =>
                      refreshAfter(
                        createLearningFromPackingItem(
                          reviewData.data.review.id,
                          item,
                          learningType,
                          reviewData.data.trip,
                        ),
                        `${item.name} tagged.`,
                      )
                    }
                  />
                ))}
              </div>
            )}
          </PageSection>

          <PageSection title="Manual learning">
            <form className="space-y-4" onSubmit={handleManualSubmit}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2 text-sm font-medium text-charcoal">
                  <span>Item name</span>
                  <input
                    className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
                    value={manualValues.itemName}
                    onChange={(event) =>
                      setManualValues((current) => ({
                        ...current,
                        itemName: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-charcoal">
                  <span>Learning type</span>
                  <select
                    className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
                    value={manualValues.learningType}
                    onChange={(event) =>
                      setManualValues((current) => ({
                        ...current,
                        learningType: event.target.value as ReviewLearningType,
                      }))
                    }
                  >
                    {reviewLearningOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium text-charcoal sm:col-span-2 xl:col-span-1">
                  <span>Notes</span>
                  <input
                    className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
                    value={manualValues.notes}
                    onChange={(event) =>
                      setManualValues((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <button
                className="min-h-11 rounded-lg bg-slateAccent px-4 py-3 text-sm font-semibold text-cream shadow-soft"
                type="submit"
              >
                Capture learning
              </button>
            </form>
          </PageSection>

          <PageSection title="Captured learnings">
            {reviewData.data.learnings.length === 0 ? (
              <p className="text-sm text-charcoal/65">No learnings captured yet.</p>
            ) : (
              <div className="grid gap-3">
                {reviewData.data.learnings.map((learning) => (
                  <LearningCard
                    key={learning.id}
                    learning={learning}
                    trip={reviewData.data.trip}
                    onAlwaysSuggest={() =>
                      confirmed(
                        markLearningAlwaysSuggest(learning.id),
                        `${learning.itemName} will always be suggested.`,
                        "Add this learning to your suggestion library as always-suggest?",
                      )
                    }
                    onNeverSuggest={() =>
                      confirmed(
                        markLearningNeverSuggest(learning.id),
                        `${learning.itemName} will no longer be suggested.`,
                        "Add this learning to your suggestion library as never-suggest?",
                      )
                    }
                    onPromoteTemplate={() =>
                      confirmed(
                        promoteLearningToTemplate(learning.id, reviewData.data.trip),
                        `${learning.itemName} promoted to a template.`,
                        "Add this learning to a reusable template?",
                      )
                    }
                    onPromoteUsefulExtra={() =>
                      confirmed(
                        promoteLearningToUsefulExtra(learning.id),
                        `${learning.itemName} promoted to Useful Extras.`,
                        "Add this learning to Useful Extras?",
                      )
                    }
                  />
                ))}
              </div>
            )}
          </PageSection>

          <PageSection title="Complete review">
            <div className="space-y-4">
              <label className="block space-y-2 text-sm font-medium text-charcoal">
                <span>Summary</span>
                <textarea
                  className="min-h-24 w-full rounded-lg border border-charcoal/15 bg-cream px-3 py-3 text-base outline-none focus:border-teal"
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                />
              </label>
              <button
                className="min-h-11 rounded-lg bg-slateAccent px-4 py-3 text-sm font-semibold text-cream shadow-soft"
                onClick={() =>
                  refreshAfter(
                    completePostTripReview(reviewData.data.trip.id, summary),
                    "Review completed and trip marked completed.",
                  )
                }
                type="button"
              >
                Complete review
              </button>
            </div>
          </PageSection>
        </>
      ) : null}
    </section>
  );
}

export function ReviewItemRow({
  item,
  onCapture,
}: {
  item: PackingItem;
  trip: Trip;
  onCapture: (learningType: ReviewLearningType) => void;
}) {
  return (
    <article className="rounded-lg border border-charcoal/10 bg-cream p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-charcoal">{item.name}</h2>
          <p className="mt-1 text-sm text-charcoal/65">
            {item.category} - {item.status} - {item.priority}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReviewButton label="Forgotten" onClick={() => onCapture("forgotten")} />
          <ReviewButton label="Unused" onClick={() => onCapture("unused")} />
          <ReviewButton label="Invaluable" onClick={() => onCapture("invaluable")} />
          <ReviewButton
            label="Wrong bag"
            onClick={() => onCapture("packed-in-wrong-bag")}
          />
          <ReviewButton
            label="Buy next"
            onClick={() => onCapture("buy-for-next-time")}
          />
        </div>
      </div>
    </article>
  );
}

function LearningCard({
  learning,
  onAlwaysSuggest,
  onNeverSuggest,
  onPromoteTemplate,
  onPromoteUsefulExtra,
}: {
  learning: ReviewLearning;
  trip: Trip;
  onAlwaysSuggest: () => void;
  onNeverSuggest: () => void;
  onPromoteTemplate: () => void;
  onPromoteUsefulExtra: () => void;
}) {
  return (
    <article className="rounded-lg border border-charcoal/10 bg-cream p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-charcoal">{learning.itemName}</h2>
            <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-charcoal/65">
              {learning.learningType}
            </span>
          </div>
          {learning.notes ? (
            <p className="mt-2 text-sm leading-6 text-charcoal/70">
              {learning.notes}
            </p>
          ) : null}
          {learning.actionTaken ? (
            <p className="mt-2 text-sm font-semibold text-teal">
              Action: {learning.actionTaken}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <ReviewButton label="Always suggest" onClick={onAlwaysSuggest} />
          <ReviewButton label="Never suggest" onClick={onNeverSuggest} />
          <ReviewButton label="Useful extra" onClick={onPromoteUsefulExtra} />
          <ReviewButton label="Template" onClick={onPromoteTemplate} />
        </div>
      </div>
    </article>
  );
}

function ReviewButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="trip-action" onClick={onClick} type="button">
      {label}
    </button>
  );
}

function ReviewStatus({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 text-sm text-charcoal/70 shadow-soft">
      {message}
    </section>
  );
}
