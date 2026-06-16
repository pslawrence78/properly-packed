import { Shirt } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ensureDatabaseReady } from "../../db";
import {
  createOutfit,
  createOutfitItem,
  deleteOutfit,
  deleteOutfitItem,
  listOutfitItemsForTrip,
  listOutfitsForTrip,
  updateOutfit,
  updateOutfitItem,
  type OutfitItemInput,
} from "../../db/repositories/outfits-repository";
import { listPackingItemsForTrip } from "../../db/repositories/packing-items-repository";
import { getTrip } from "../../db/repositories/trips-repository";
import { listTravellers } from "../../db/repositories/travellers-repository";
import type { Outfit, OutfitItem, PackingItem, Traveller } from "../../db/types";
import { PageSection } from "../../components/layout/PageSection";
import { useAsyncData } from "../../hooks/use-async-data";
import { OutfitForm } from "./OutfitForm";
import { OutfitItemForm } from "./OutfitItemForm";
import {
  calculateOutfitProgress,
  findUnplannedDayAndEveningSlots,
  outfitStatusOptions,
  outfitTypeOptions,
} from "./outfit-utils";

export function OutfitPlannerScreen() {
  const { tripId } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOutfitId, setEditingOutfitId] = useState<string | undefined>();
  const [addingItemOutfitId, setAddingItemOutfitId] = useState<string | undefined>();
  const [editingItemId, setEditingItemId] = useState<string | undefined>();

  const outfitData = useAsyncData(async () => {
    await ensureDatabaseReady();

    if (!tripId) {
      throw new Error("Trip not found.");
    }

    const [trip, travellers, outfits, outfitItems, packingItems] = await Promise.all([
      getTrip(tripId),
      listTravellers(),
      listOutfitsForTrip(tripId),
      listOutfitItemsForTrip(tripId),
      listPackingItemsForTrip(tripId),
    ]);

    if (!trip) {
      throw new Error("Trip not found.");
    }

    return { trip, travellers, outfits, outfitItems, packingItems };
  }, [tripId, refreshKey]);

  const progress = useMemo(() => {
    if (outfitData.state !== "ready") {
      return calculateOutfitProgress([], []);
    }

    return calculateOutfitProgress(
      outfitData.data.outfits,
      outfitData.data.outfitItems,
    );
  }, [outfitData]);

  const unplannedSlots = useMemo(() => {
    if (outfitData.state !== "ready") {
      return [];
    }

    return findUnplannedDayAndEveningSlots(
      outfitData.data.trip.nights,
      outfitData.data.outfits,
    );
  }, [outfitData]);

  async function refreshAfter(action: Promise<unknown>) {
    await action;
    setShowCreateForm(false);
    setEditingOutfitId(undefined);
    setAddingItemOutfitId(undefined);
    setEditingItemId(undefined);
    setRefreshKey((key) => key + 1);
  }

  return (
    <section className="space-y-5">
      {outfitData.state === "loading" ? (
        <OutfitStatus message="Loading outfit planner..." />
      ) : null}
      {outfitData.state === "error" ? (
        <OutfitStatus message={outfitData.error} />
      ) : null}
      {outfitData.state === "ready" ? (
        <>
          <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
            <p className="inline-flex items-center gap-2 rounded-full bg-coralSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-coral">
              <Shirt aria-hidden="true" className="h-4 w-4" />
              Outfit Planner
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
                  {outfitData.data.trip.name}
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
                  Plan day, evening, travel and special outfits without forcing
                  every clothing item into the packing list.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="min-h-11 rounded-lg bg-slateAccent px-4 py-3 text-sm font-semibold text-cream shadow-soft"
                  onClick={() => setShowCreateForm((visible) => !visible)}
                  type="button"
                >
                  {showCreateForm ? "Close form" : "Add outfit"}
                </button>
                <Link className="trip-action" to={`/trips/${outfitData.data.trip.id}`}>
                  Trip overview
                </Link>
                <Link
                  className="trip-action"
                  to={`/trips/${outfitData.data.trip.id}/pack`}
                >
                  Packing list
                </Link>
              </div>
            </div>
          </div>

          <PageSection title="Outfit progress">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Outfits" value={`${progress.outfitCount}`} />
              <Metric label="Packed" value={`${progress.packedCount}`} />
              <Metric label="Still deciding" value={`${progress.decidingCount}`} />
              <Metric label="Rewear options" value={`${progress.rewearCount}`} />
              <Metric label="Items" value={`${progress.itemCount}`} />
              <Metric label="Packed items" value={`${progress.packedItemCount}`} />
              <Metric label="Shoes" value={`${progress.shoeCount}`} />
              <Metric label="Accessories" value={`${progress.accessoryCount}`} />
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-cream">
              <div
                className="pp-progress-bar h-full rounded-full bg-teal"
                style={{ width: `${progress.percentPacked}%` }}
              />
            </div>
          </PageSection>

          {showCreateForm ? (
            <OutfitForm
              submitLabel="Create outfit"
              travellers={outfitData.data.travellers}
              tripId={outfitData.data.trip.id}
              onCancel={() => setShowCreateForm(false)}
              onSubmit={(input) => refreshAfter(createOutfit(input))}
            />
          ) : null}

          <PageSection title="Unplanned day and evening slots">
            {unplannedSlots.length === 0 ? (
              <p className="text-sm text-charcoal/65">
                Every day and evening slot has at least one planned outfit.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {unplannedSlots.slice(0, 18).map((slot) => (
                  <li
                    className="rounded-full bg-cream px-3 py-2 text-xs font-semibold text-charcoal/70"
                    key={`${slot.day}:${slot.outfitType}`}
                  >
                    Day {slot.day} {slot.outfitType}
                  </li>
                ))}
              </ul>
            )}
          </PageSection>

          <div className="grid gap-4">
            {outfitData.data.outfits.length === 0 ? (
              <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
                <h2 className="text-xl font-semibold text-charcoal">
                  No outfits planned yet
                </h2>
                <p className="mt-2 text-sm leading-6 text-charcoal/70">
                  Add Beck's first day or evening outfit, then add clothing,
                  shoes and accessories underneath it.
                </p>
              </section>
            ) : null}

            {outfitData.data.outfits.map((outfit) =>
              editingOutfitId === outfit.id ? (
                <OutfitForm
                  initialOutfit={outfit}
                  key={outfit.id}
                  submitLabel="Save outfit"
                  travellers={outfitData.data.travellers}
                  tripId={outfitData.data.trip.id}
                  onCancel={() => setEditingOutfitId(undefined)}
                  onSubmit={(input) => refreshAfter(updateOutfit(outfit.id, input))}
                />
              ) : (
                <OutfitCard
                  addingItem={addingItemOutfitId === outfit.id}
                  editingItemId={editingItemId}
                  key={outfit.id}
                  outfit={outfit}
                  outfitItems={outfitData.data.outfitItems.filter(
                    (item) => item.outfitId === outfit.id,
                  )}
                  packingItems={outfitData.data.packingItems}
                  travellers={outfitData.data.travellers}
                  onAddItem={() => setAddingItemOutfitId(outfit.id)}
                  onCancelItem={() => {
                    setAddingItemOutfitId(undefined);
                    setEditingItemId(undefined);
                  }}
                  onCreateItem={(input) => refreshAfter(createOutfitItem(input))}
                  onDelete={() => refreshAfter(deleteOutfit(outfit.id))}
                  onDeleteItem={(itemId) => refreshAfter(deleteOutfitItem(itemId))}
                  onEdit={() => setEditingOutfitId(outfit.id)}
                  onEditItem={(itemId) => setEditingItemId(itemId)}
                  onStatus={(status) =>
                    refreshAfter(updateOutfit(outfit.id, { status }))
                  }
                  onToggleRewear={() =>
                    refreshAfter(
                      updateOutfit(outfit.id, {
                        rewearEligible: !outfit.rewearEligible,
                      }),
                    )
                  }
                  onUpdateItem={(itemId, input) =>
                    refreshAfter(updateOutfitItem(itemId, input))
                  }
                />
              ),
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}

function OutfitCard({
  addingItem,
  editingItemId,
  onAddItem,
  onCancelItem,
  onCreateItem,
  onDelete,
  onDeleteItem,
  onEdit,
  onEditItem,
  onStatus,
  onToggleRewear,
  onUpdateItem,
  outfit,
  outfitItems,
  packingItems,
  travellers,
}: {
  addingItem: boolean;
  editingItemId?: string;
  onAddItem: () => void;
  onCancelItem: () => void;
  onCreateItem: (input: OutfitItemInput) => Promise<void>;
  onDelete: () => void;
  onDeleteItem: (itemId: string) => void;
  onEdit: () => void;
  onEditItem: (itemId: string) => void;
  onStatus: (status: Outfit["status"]) => void;
  onToggleRewear: () => void;
  onUpdateItem: (itemId: string, input: OutfitItemInput) => Promise<void>;
  outfit: Outfit;
  outfitItems: OutfitItem[];
  packingItems: PackingItem[];
  travellers: Traveller[];
}) {
  const owner = travellers.find((traveller) => traveller.id === outfit.ownerTravellerId);
  const statusLabel =
    outfitStatusOptions.find((option) => option.value === outfit.status)?.label ??
    outfit.status;
  const typeLabel =
    outfitTypeOptions.find((option) => option.value === outfit.outfitType)?.label ??
    outfit.outfitType;

  return (
    <article className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-charcoal">{outfit.name}</h2>
            <Badge label={statusLabel} />
            {outfit.rewearEligible ? <Badge label="Rewear eligible" /> : null}
          </div>
          <p className="mt-2 text-sm text-charcoal/70">
            {owner?.name ?? "Unknown owner"} - {typeLabel}
            {outfit.plannedForDay ? ` - day ${outfit.plannedForDay}` : ""}
            {outfit.plannedForDate ? ` - ${outfit.plannedForDate}` : ""}
          </p>
          {outfit.activityContext ? (
            <p className="mt-1 text-sm text-charcoal/70">
              Context: {outfit.activityContext}
            </p>
          ) : null}
          {outfit.notes ? (
            <p className="mt-2 text-sm leading-6 text-charcoal/70">
              {outfit.notes}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="trip-action" onClick={() => onStatus("packed")} type="button">
            Packed
          </button>
          <button
            className="trip-action"
            onClick={() => onStatus("still-deciding")}
            type="button"
          >
            Still deciding
          </button>
          <button className="trip-action" onClick={onToggleRewear} type="button">
            {outfit.rewearEligible ? "Unset rewear" : "Rewear"}
          </button>
          <button className="trip-action" onClick={onEdit} type="button">
            Edit
          </button>
          <button className="trip-action" onClick={onDelete} type="button">
            Delete
          </button>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-charcoal">Outfit items</h3>
          <button className="trip-action" onClick={onAddItem} type="button">
            Add item
          </button>
        </div>

        {addingItem ? (
          <OutfitItemForm
            outfitId={outfit.id}
            packingItems={packingItems}
            submitLabel="Add outfit item"
            onCancel={onCancelItem}
            onSubmit={onCreateItem}
          />
        ) : null}

        {outfitItems.length === 0 ? (
          <p className="mt-3 text-sm text-charcoal/65">No items added yet.</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {outfitItems.map((item) =>
              editingItemId === item.id ? (
                <li key={item.id} className="sm:col-span-2 xl:col-span-3">
                  <OutfitItemForm
                    initialItem={item}
                    outfitId={outfit.id}
                    packingItems={packingItems}
                    submitLabel="Save item"
                    onCancel={onCancelItem}
                    onSubmit={(input) => onUpdateItem(item.id, input)}
                  />
                </li>
              ) : (
                <OutfitItemRow
                  item={item}
                  key={item.id}
                  linkedPackingItem={packingItems.find(
                    (packingItem) => packingItem.id === item.packingItemId,
                  )}
                  onDelete={() => onDeleteItem(item.id)}
                  onEdit={() => onEditItem(item.id)}
                />
              ),
            )}
          </ul>
        )}
      </div>
    </article>
  );
}

function OutfitItemRow({
  item,
  linkedPackingItem,
  onDelete,
  onEdit,
}: {
  item: OutfitItem;
  linkedPackingItem?: PackingItem;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <li className="rounded-lg border border-charcoal/10 bg-cream px-4 py-3 text-sm text-charcoal">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="font-semibold">{item.name}</span>
          <span className="block text-charcoal/65">
            {item.itemType} - {item.status}
          </span>
          {linkedPackingItem ? (
            <span className="block text-charcoal/65">
              Linked: {linkedPackingItem.name}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="trip-action min-h-9 px-3 py-2" onClick={onEdit} type="button">
            Edit
          </button>
          <button
            className="trip-action min-h-9 px-3 py-2"
            onClick={onDelete}
            type="button"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-cream p-4">
      <p className="text-sm font-medium text-charcoal/64">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-charcoal">{value}</p>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-charcoal/70">
      {label}
    </span>
  );
}

function OutfitStatus({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 text-sm text-charcoal/70 shadow-soft">
      {message}
    </section>
  );
}
