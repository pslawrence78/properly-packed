import { Luggage } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TripNotFoundState } from "../../components/empty-states/TripNotFoundState";
import { ensureDatabaseReady } from "../../db";
import {
  archiveBag,
  createBag,
  listBagsForTrip,
  updateBag,
} from "../../db/repositories/bags-repository";
import { listPackingItemsForTrip } from "../../db/repositories/packing-items-repository";
import { getTrip } from "../../db/repositories/trips-repository";
import { listTravellers } from "../../db/repositories/travellers-repository";
import type { Bag, PackingItem, Traveller } from "../../db/types";
import { useAsyncData } from "../../hooks/use-async-data";
import { BagForm } from "./BagForm";
import { calculateBagProgress, listItemsForBag } from "./bag-utils";

export function BagsScreen() {
  const { tripId } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBagId, setEditingBagId] = useState<string | undefined>();
  const [actionError, setActionError] = useState<string | undefined>();
  const bagData = useAsyncData(async () => {
    await ensureDatabaseReady();

    if (!tripId) throw new Error("Trip not found.");

    const [trip, travellers, bags, items] = await Promise.all([
      getTrip(tripId),
      listTravellers(),
      listBagsForTrip(tripId),
      listPackingItemsForTrip(tripId),
    ]);

    if (!trip) throw new Error("Trip not found.");

    return {
      trip,
      travellers: travellers.filter((traveller) =>
        trip.travellerIds.includes(traveller.id),
      ),
      bags,
      items,
    };
  }, [tripId, refreshKey]);

  async function refreshAfter(action: Promise<unknown>) {
    setActionError(undefined);
    try {
      await action;
      setShowCreateForm(false);
      setEditingBagId(undefined);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not update bags.",
      );
    }
  }

  return (
    <section className="space-y-5">
      {bagData.state === "loading" ? <BagStatus message="Loading bags..." /> : null}
      {bagData.state === "error" ? (
        bagData.error === "Trip not found." ? (
          <TripNotFoundState />
        ) : (
          <BagStatus message={bagData.error} />
        )
      ) : null}
      {bagData.state === "ready" ? (
        <>
          <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
            <p className="inline-flex items-center gap-2 rounded-full bg-blueSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-tealDeep">
              <Luggage aria-hidden="true" className="h-4 w-4" />
              Bags
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
                  {bagData.data.trip.name}
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
                  See where each packed item is going and what is still without a bag.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="min-h-12 rounded-lg bg-slateAccent px-5 py-3 text-sm font-semibold text-cream shadow-soft"
                  onClick={() => setShowCreateForm((visible) => !visible)}
                  type="button"
                >
                  {showCreateForm ? "Close form" : "Add bag"}
                </button>
                <Link className="trip-action" to={`/trips/${bagData.data.trip.id}/pack`}>
                  Packing list
                </Link>
              </div>
            </div>
          </div>

          {actionError ? <BagStatus message={actionError} /> : null}

          {showCreateForm ? (
            <BagForm
              travellers={bagData.data.travellers}
              tripId={bagData.data.trip.id}
              submitLabel="Create bag"
              onCancel={() => setShowCreateForm(false)}
              onSubmit={(input) => refreshAfter(createBag(input))}
            />
          ) : null}

          {bagData.data.bags.length === 0 && !showCreateForm ? (
            <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
              <h2 className="text-2xl font-semibold text-charcoal">No bags yet</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-charcoal/70 sm:text-base">
                Bags are optional, but adding them makes it easy to answer “where is
                this packed?” Use a neutral bag or optionally assign one to a traveller.
              </p>
              <button
                className="mt-5 min-h-12 rounded-lg bg-slateAccent px-5 text-sm font-semibold text-cream shadow-soft"
                onClick={() => setShowCreateForm(true)}
                type="button"
              >
                Add your first bag
              </button>
            </section>
          ) : null}

          <NoBagSection items={bagData.data.items} tripId={bagData.data.trip.id} />

          <div className="grid gap-4">
            {bagData.data.bags.map((bag) =>
              editingBagId === bag.id ? (
                <BagForm
                  initialBag={bag}
                  key={bag.id}
                  travellers={bagData.data.travellers}
                  tripId={bagData.data.trip.id}
                  submitLabel="Save bag"
                  onCancel={() => setEditingBagId(undefined)}
                  onSubmit={(input) => refreshAfter(updateBag(bag.id, input))}
                />
              ) : (
                <BagCard
                  bag={bag}
                  items={bagData.data.items}
                  key={bag.id}
                  onArchive={() => {
                    const count = listItemsForBag(bagData.data.items, bag.id).length;
                    const consequence =
                      count === 0
                        ? "It will be removed from active bag lists."
                        : `${count} assigned ${count === 1 ? "item" : "items"} will be kept and changed to No bag assigned.`;
                    if (window.confirm(`Archive “${bag.name}”? ${consequence}`)) {
                      void refreshAfter(archiveBag(bag.id));
                    }
                  }}
                  onEdit={() => setEditingBagId(bag.id)}
                  travellers={bagData.data.travellers}
                />
              ),
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}

function NoBagSection({ items, tripId }: { items: PackingItem[]; tripId: string }) {
  const unbaggedItems = listItemsForBag(items);
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">No bag assigned</h2>
          <p className="mt-1 text-sm text-charcoal/65">
            A valid holding place while an item’s packing location is undecided.
          </p>
        </div>
        <Link className="trip-action min-h-11 justify-center" to={`/trips/${tripId}/pack?bag=__unassigned`}>
          View in packing list
        </Link>
      </div>
      <div className="mt-4">
        <BagItemsList emptyMessage="No items are waiting for a bag." items={unbaggedItems} />
      </div>
    </section>
  );
}

function BagCard({
  bag,
  items,
  onArchive,
  onEdit,
  travellers,
}: {
  bag: Bag;
  items: PackingItem[];
  onArchive: () => void;
  onEdit: () => void;
  travellers: Traveller[];
}) {
  const owner = travellers.find((traveller) => traveller.id === bag.ownerTravellerId);
  const progress = calculateBagProgress(items, bag.id);
  const bagItems = listItemsForBag(items, bag.id);

  return (
    <article className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-charcoal">{bag.name}</h2>
            {bag.isHandLuggage ? <Badge label="Hand luggage" /> : null}
            {bag.isTravelDay ? <Badge label="Travel day" /> : null}
            {bag.isCruiseEmbarkation ? <Badge label="Embarkation" /> : null}
          </div>
          <p className="mt-2 text-sm text-charcoal/70">
            {formatBagType(bag.bagType)} · {owner?.name ?? "Neutral / no owner"}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <BagMetric label="Items" value={progress.itemCount} />
            <BagMetric label="Packed" value={progress.packedCount} />
            <BagMetric label="Outstanding" value={progress.outstandingCount} />
            <BagMetric label="Progress" value={`${progress.percentPacked}%`} />
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-cream">
            <div
              aria-label={`${progress.percentPacked}% packed`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progress.percentPacked}
              className="h-full rounded-full bg-teal"
              role="progressbar"
              style={{ width: `${progress.percentPacked}%` }}
            />
          </div>
          {progress.notTakingCount > 0 ? (
            <p className="mt-2 text-sm text-charcoal/65">
              {progress.notTakingCount} not taking (excluded from outstanding)
            </p>
          ) : null}
          {bag.notes ? (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-charcoal/70">{bag.notes}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="trip-action" onClick={onEdit} type="button">Edit</button>
          <button className="trip-action" onClick={onArchive} type="button">Archive</button>
          <Link className="trip-action" to={`/trips/${bag.tripId}/pack?bag=${bag.id}`}>
            Manage items
          </Link>
        </div>
      </div>
      <div className="mt-5">
        <h3 className="mb-3 text-sm font-semibold text-charcoal">Items in this bag</h3>
        <BagItemsList items={bagItems} />
      </div>
    </article>
  );
}

function BagItemsList({
  emptyMessage = "No items in this bag yet.",
  items,
}: {
  emptyMessage?: string;
  items: PackingItem[];
}) {
  if (items.length === 0) return <p className="text-sm text-charcoal/65">{emptyMessage}</p>;

  return (
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <li className="rounded-lg border border-charcoal/10 bg-cream px-4 py-3 text-sm text-charcoal" key={item.id}>
          <span className="font-semibold">{item.name}</span>
          <span className="block text-charcoal/65">
            {item.status === "not-taking"
              ? "Not taking"
              : item.status === "packed"
                ? "Packed"
                : "Outstanding"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function BagMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-cream px-3 py-2">
      <p className="text-xs font-medium text-charcoal/60">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-charcoal">{value}</p>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-charcoal/70">{label}</span>;
}

function formatBagType(value: Bag["bagType"]) {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function BagStatus({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 text-sm text-charcoal/70 shadow-soft">
      {message}
    </section>
  );
}
