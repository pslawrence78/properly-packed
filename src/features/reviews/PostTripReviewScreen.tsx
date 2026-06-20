import { NotebookPen } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { TripNotFoundState } from "../../components/empty-states/TripNotFoundState";
import { ensureDatabaseReady } from "../../db";
import { listPackingItemsForTrip } from "../../db/repositories/packing-items-repository";
import {
  completePostTripReview,
  archiveReviewLearning,
  createLearningFromPackingItem,
  createReviewLearning,
  getPostTripReviewSummary,
  markLearningAlwaysSuggest,
  markLearningNeverSuggest,
  promoteLearningToTemplate,
  promoteLearningToUsefulExtra,
  reopenPostTripReview,
  savePostTripReviewSummary,
  updateReviewLearning,
} from "../../db/repositories/post-trip-reviews-repository";
import { listBagsForTrip } from "../../db/repositories/bags-repository";
import { listTravellers } from "../../db/repositories/travellers-repository";
import { listTemplates } from "../../db/repositories/templates-repository";
import { getTrip, updateTrip } from "../../db/repositories/trips-repository";
import type {
  PackingItem,
  Bag,
  ReviewLearning,
  ReviewLearningType,
  Template,
  Trip,
  Traveller,
} from "../../db/types";
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
    category: "",
    ownerTravellerId: "",
  });
  const [summary, setSummary] = useState("");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<
    Record<string, string>
  >({});

  const reviewData = useAsyncData(async () => {
    await ensureDatabaseReady();

    if (!tripId) {
      throw new Error("Trip not found.");
    }

    const [trip, packingItems, templates, bags, travellers] = await Promise.all([
      getTrip(tripId),
      listPackingItemsForTrip(tripId),
      listTemplates(),
      listBagsForTrip(tripId),
      listTravellers(),
    ]);

    if (!trip) {
      throw new Error("Trip not found.");
    }

    const reviewSummary = await getPostTripReviewSummary(trip.id);
    return { trip, packingItems, templates, bags, travellers: travellers.filter((traveller) => trip.travellerIds.includes(traveller.id)), ...reviewSummary };
  }, [tripId, refreshKey]);

  useEffect(() => {
    if (reviewData.state === "ready") setSummary(reviewData.data.review.summary ?? "");
  }, [reviewData.state === "ready" ? reviewData.data.review.updatedAt : ""]);

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
        category: manualValues.category || undefined,
        ownerTravellerId: manualValues.ownerTravellerId || undefined,
      }),
      "Learning captured.",
    );
    setManualValues({ itemName: "", learningType: "forgotten", notes: "", category: "", ownerTravellerId: "" });
  }

  async function confirmed(
    action: () => Promise<unknown>,
    success: string,
    prompt: string,
  ) {
    if (!window.confirm(prompt)) {
      return;
    }

    await refreshAfter(action(), success);
  }

  return (
    <section className="space-y-5">
      {reviewData.state === "loading" ? (
        <ReviewStatus message="Loading post-trip review..." />
      ) : null}
      {reviewData.state === "error" ? (
        reviewData.error === "Trip not found." ? (
          <TripNotFoundState />
        ) : (
          <ReviewStatus message={reviewData.error} />
        )
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
                <p className="mt-2 text-sm text-charcoal/65">
                  {reviewData.data.trip.tripType.replace(/-/g, " ")} · {reviewData.data.trip.startDate} to {reviewData.data.trip.endDate} · {reviewData.data.review.status}
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
                    bags={reviewData.data.bags}
                    onCapture={(learningType, suggestedBag) =>
                      refreshAfter(
                        createLearningFromPackingItem(
                          reviewData.data.review.id,
                          item,
                          learningType,
                          reviewData.data.trip,
                          undefined,
                          suggestedBag,
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
                  <span>Category (optional)</span>
                  <input className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base" value={manualValues.category} onChange={(event) => setManualValues((current) => ({ ...current, category: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm font-medium text-charcoal">
                  <span>Owner (optional)</span>
                  <select className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base" value={manualValues.ownerTravellerId} onChange={(event) => setManualValues((current) => ({ ...current, ownerTravellerId: event.target.value }))}>
                    <option value="">Shared / not specified</option>
                    {reviewData.data.travellers.map((traveller) => <option key={traveller.id} value={traveller.id}>{traveller.name}</option>)}
                  </select>
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
                    templates={reviewData.data.templates}
                    selectedTemplateId={selectedTemplateIds[learning.id] ?? ""}
                    onTemplateChange={(templateId) =>
                      setSelectedTemplateIds((current) => ({
                        ...current,
                        [learning.id]: templateId,
                      }))
                    }
                    onAlwaysSuggest={() =>
                      confirmed(
                        () => markLearningAlwaysSuggest(learning.id),
                        `${learning.itemName} will always be suggested.`,
                        "Add this learning to your suggestion library as always-suggest?",
                      )
                    }
                    onNeverSuggest={() =>
                      confirmed(
                        () => markLearningNeverSuggest(learning.id),
                        `${learning.itemName} will no longer be suggested.`,
                        "Add this learning to your suggestion library as never-suggest?",
                      )
                    }
                    onPromoteTemplate={() => {
                      const templateId = selectedTemplateIds[learning.id];
                      const template = reviewData.data.templates.find(
                        (candidate) => candidate.id === templateId,
                      );
                      if (!template) return;
                      void confirmed(
                        () => promoteLearningToTemplate(learning.id, template.id),
                        `${learning.itemName} added to ${template.name}.`,
                        `Add this learning to “${template.name}”?`,
                      );
                    }}
                    onPromoteUsefulExtra={() =>
                      confirmed(
                        () => promoteLearningToUsefulExtra(learning.id),
                        `${learning.itemName} promoted to Useful Extras.`,
                        "Add this learning to Useful Extras?",
                      )
                    }
                    onUpdateNotes={(notes) => refreshAfter(updateReviewLearning(learning.id, { notes }), "Learning notes updated.")}
                    onArchive={() => confirmed(() => archiveReviewLearning(learning.id), "Learning removed.", "Remove this learning from the review?")}
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
              <button className="trip-action ml-2" onClick={() => refreshAfter(savePostTripReviewSummary(reviewData.data.trip.id, summary), "Summary saved.")} type="button">Save draft</button>
              {reviewData.data.review.status === "completed" ? (
                <button className="trip-action ml-2" onClick={() => refreshAfter(reopenPostTripReview(reviewData.data.trip.id), "Review reopened.")} type="button">Reopen review</button>
              ) : null}
            </div>
          </PageSection>
        </>
      ) : null}
    </section>
  );
}

export function ReviewItemRow({
  item,
  bags = [],
  onCapture,
}: {
  item: PackingItem;
  trip: Trip;
  bags?: Bag[];
  onCapture: (learningType: ReviewLearningType, suggestedBag?: Bag) => void;
}) {
  const [suggestedBagId, setSuggestedBagId] = useState("");
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
          <ReviewButton label="Always suggest" onClick={() => onCapture("always-suggest")} />
          <ReviewButton label="Do not suggest" onClick={() => onCapture("do-not-suggest-again")} />
        </div>
      </div>
      {bags.length > 0 ? (
        <label className="mt-3 block max-w-sm space-y-1 text-sm font-medium text-charcoal">
          <span>Better bag next time (optional)</span>
          <span className="flex gap-2">
            <select className="min-h-11 min-w-0 flex-1 rounded-lg border border-charcoal/15 bg-paper px-3" value={suggestedBagId} onChange={(event) => setSuggestedBagId(event.target.value)}>
              <option value="">Choose a bag</option>
              {bags.filter((bag) => bag.id !== item.bagId).map((bag) => <option key={bag.id} value={bag.id}>{bag.name}</option>)}
            </select>
            <button className="trip-action" disabled={!suggestedBagId} onClick={() => onCapture("packed-in-wrong-bag", bags.find((bag) => bag.id === suggestedBagId))} type="button">Save</button>
          </span>
        </label>
      ) : null}
    </article>
  );
}

export function LearningCard({
  learning,
  onAlwaysSuggest,
  onNeverSuggest,
  onPromoteTemplate,
  onPromoteUsefulExtra,
  onTemplateChange,
  onUpdateNotes,
  onArchive,
  selectedTemplateId,
  templates,
}: {
  learning: ReviewLearning;
  onAlwaysSuggest: () => void;
  onNeverSuggest: () => void;
  onPromoteTemplate: () => void;
  onPromoteUsefulExtra: () => void;
  onTemplateChange: (templateId: string) => void;
  onUpdateNotes?: (notes: string) => void;
  onArchive?: () => void;
  selectedTemplateId: string;
  templates: Template[];
}) {
  const [notes, setNotes] = useState(learning.notes ?? "");
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
        <div className="flex max-w-md flex-col gap-3">
          <label className="block space-y-1 text-sm font-medium text-charcoal">
            <span>Target template</span>
            <select
              className="min-h-11 w-full rounded-lg border border-charcoal/15 bg-paper px-3 text-sm outline-none focus:border-teal"
              value={selectedTemplateId}
              onChange={(event) => onTemplateChange(event.target.value)}
            >
              <option value="">Choose a template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          {!selectedTemplateId ? (
            <p className="text-xs leading-5 text-charcoal/60">
              Choose a template before promoting this learning.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
          <ReviewButton label="Always suggest" onClick={onAlwaysSuggest} />
          <ReviewButton label="Never suggest" onClick={onNeverSuggest} />
          <ReviewButton label="Useful extra" onClick={onPromoteUsefulExtra} />
          <ReviewButton
            disabled={!selectedTemplateId}
            label="Add to template"
            onClick={onPromoteTemplate}
          />
          </div>
          {onUpdateNotes ? (
            <label className="block space-y-1 text-sm font-medium text-charcoal">
              <span>Notes</span>
              <textarea className="min-h-20 w-full rounded-lg border border-charcoal/15 bg-paper px-3 py-2" value={notes} onChange={(event) => setNotes(event.target.value)} />
              <button className="trip-action" onClick={() => onUpdateNotes(notes)} type="button">Save notes</button>
            </label>
          ) : null}
          {onArchive ? <button className="trip-action self-start" onClick={onArchive} type="button">Remove learning</button> : null}
        </div>
      </div>
    </article>
  );
}

function ReviewButton({
  disabled = false,
  label,
  onClick,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="trip-action disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
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
