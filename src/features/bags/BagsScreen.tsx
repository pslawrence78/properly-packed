import { Luggage } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ensureDatabaseReady } from "../../db";
import {
  archiveBag,
  createBag,
  createDefaultBagsForTrip,
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
  const bagData = useAsyncData(async () => {
    await ensureDatabaseReady();

    if (!tripId) {
      throw new Error("Trip not found.");
    }

    const [trip, travellers, bags, items] = await Promise.all([
      getTrip(tripId),
      listTravellers(),
      listBagsForTrip(tripId),
      listPackingItemsForTrip(tripId),
    ]);

    if (!trip) {
      throw new Error("Trip not found.");
    }

    return { trip, travellers, bags, items };
  }, [tripId, refreshKey]);

  async function refreshAfter(action: Promise<unknown>) {
    await action;
    setShowCreateForm(false);
    setEditingBagId(undefined);
    setRefreshKey((key) => key + 1);
  }

  return (
    <section className="space-y-5">
      {bagData.state === "loading" ? (
        <BagStatus message="Loading bags..." />
      ) : null}
      {bagData.state === "error" ? <BagStatus message={bagData.error} /> : null}
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
                  See where each packed item is going and what is still unassigned.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="min-h-11 rounded-lg bg-slateAccent px-4 py-3 text-sm font-semibold text-cream shadow-soft"
                  onClick={() => setShowCreateForm((visible) => !visible)}
                  type="button"
                >
                  {showCreateForm ? "Close form" : "Create bag"}
                </button>
                <button
                  className="trip-action"
                  onClick={() =>
                    refreshAfter(
                      createDefaultBagsForTrip(
                        bagData.data.trip.id,
                        bagData.data.travellers,
                      ),
                    )
                  }
                  type="button"
                >
                  Ensure defaults
                </button>
                <Link
                  className="trip-action"
                  to={`/trips/${bagData.data.trip.id}/pack`}
                >
                  Packing list
                </Link>
              </div>
            </div>
          </div>

          {showCreateForm ? (
            <BagForm
              travellers={bagData.data.travellers}
              tripId={bagData.data.trip.id}
              submitLabel="Create bag"
              onCancel={() => setShowCreateForm(false)}
              onSubmit={(input) => refreshAfter(createBag(input))}
            />
          ) : null}

          <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
            <h2 className="text-lg font-semibold text-charcoal">Unassigned items</h2>
            <BagItemsList items={listItemsForBag(bagData.data.items)} />
          </section>

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
                  onArchive={() => refreshAfter(archiveBag(bag.id))}
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
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-charcoal">{bag.name}</h2>
            {bag.isHandLuggage ? <Badge label="Hand luggage" /> : null}
            {bag.isTravelDay ? <Badge label="Travel day" /> : null}
            {bag.isCruiseEmbarkation ? <Badge label="Embarkation" /> : null}
          </div>
          <p className="mt-2 text-sm text-charcoal/70">
            {bag.bagType} · {owner?.name ?? "Shared or unowned"}
          </p>
          <p className="mt-2 text-sm text-charcoal/70">
            {progress.packedCount}/{progress.packableCount} packed ·{" "}
            {progress.percentPacked}% ready
          </p>
          {bag.notes ? (
            <p className="mt-2 text-sm leading-6 text-charcoal/70">{bag.notes}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="trip-action" onClick={onEdit} type="button">
            Edit
          </button>
          <button className="trip-action" onClick={onArchive} type="button">
            Archive
          </button>
        </div>
      </div>
      <div className="mt-5">
        <BagItemsList items={bagItems} />
      </div>
    </article>
  );
}

function BagItemsList({ items }: { items: PackingItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-charcoal/65">No items here yet.</p>;
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <li
          className="rounded-lg border border-charcoal/10 bg-cream px-4 py-3 text-sm text-charcoal"
          key={item.id}
        >
          <span className="font-semibold">{item.name}</span>
          <span className="block text-charcoal/65">{item.status}</span>
        </li>
      ))}
    </ul>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-charcoal/70">
      {label}
    </span>
  );
}

function BagStatus({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 text-sm text-charcoal/70 shadow-soft">
      {message}
    </section>
  );
}
