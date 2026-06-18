import { Check, PackagePlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { TripNotFoundState } from "../../components/empty-states/TripNotFoundState";
import { ensureDatabaseReady } from "../../db";
import { getSetting } from "../../db/repositories/app-settings-repository";
import { listBagsForTrip } from "../../db/repositories/bags-repository";
import {
  archivePackingItem,
  createPackingItem,
  listPackingItemsForTrip,
  updatePackingItem,
  updatePackingItemStatus,
} from "../../db/repositories/packing-items-repository";
import { getTrip } from "../../db/repositories/trips-repository";
import { listTravellers } from "../../db/repositories/travellers-repository";
import type { Bag, PackingItem, Traveller } from "../../db/types";
import { useAsyncData } from "../../hooks/use-async-data";
import { PackingItemForm } from "./PackingItemForm";
import { QuickAddPackingItem } from "./QuickAddPackingItem";
import {
  calculatePackingProgress,
  filterPackingItems,
  getQuickAddOwnershipDefault,
  packingPriorityOptions,
  packingStatusOptions,
  SHARED_OWNERSHIP_FILTER,
  type PackingFilters,
  UNASSIGNED_OWNERSHIP_FILTER,
} from "./packing-item-utils";
import { getBagName } from "../bags/bag-utils";

export function PackingListScreen() {
  const { tripId } = useParams();
  const [searchParams] = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [quickAddFocusRequest, setQuickAddFocusRequest] = useState(0);
  const [editingItemId, setEditingItemId] = useState<string | undefined>();
  const [filters, setFilters] = useState<PackingFilters>(emptyPackingFilters);

  useEffect(() => {
    setFilters({
      ownerTravellerId: searchParams.get("owner") ?? "",
      category: searchParams.get("category") ?? "",
      status: searchParams.get("status") ?? "",
      priority: searchParams.get("priority") ?? "",
      bagId: searchParams.get("bag") ?? "",
      search: searchParams.get("search") ?? "",
    });
  }, [searchParams]);

  const packingData = useAsyncData(async () => {
    await ensureDatabaseReady();

    if (!tripId) {
      throw new Error("Trip not found.");
    }

    const [trip, travellers, items, bags, categorySetting] = await Promise.all([
      getTrip(tripId),
      listTravellers(),
      listPackingItemsForTrip(tripId),
      listBagsForTrip(tripId),
      getSetting("defaultCategories"),
    ]);

    if (!trip) {
      throw new Error("Trip not found.");
    }

    const categories = Array.isArray(categorySetting?.value)
      ? categorySetting.value
          .filter((value): value is string => typeof value === "string")
          .sort()
      : [];

    return { trip, travellers, items, bags, categories };
  }, [tripId, refreshKey]);

  const filteredItems = useMemo(() => {
    if (packingData.state !== "ready") {
      return [];
    }

    return filterPackingItems(
      packingData.data.items,
      filters,
      packingData.data.bags,
    );
  }, [filters, packingData]);

  const progress = useMemo(() => {
    if (packingData.state !== "ready") {
      return calculatePackingProgress([]);
    }

    return calculatePackingProgress(packingData.data.items);
  }, [packingData]);

  const quickAddOwnership = useMemo(() => {
    if (packingData.state !== "ready") {
      return { ownershipScope: "unassigned" as const };
    }
    return getQuickAddOwnershipDefault(
      filters.ownerTravellerId,
      packingData.data.travellers.map((traveller) => traveller.id),
    );
  }, [filters.ownerTravellerId, packingData]);

  async function refreshAfter(action: Promise<unknown>) {
    await action;
    setShowAddForm(false);
    setEditingItemId(undefined);
    setRefreshKey((key) => key + 1);
  }

  async function refreshAfterQuickAdd(action: Promise<unknown>) {
    await action;
    setRefreshKey((key) => key + 1);
  }

  return (
    <section className="space-y-5">
      {packingData.state === "loading" ? (
        <PackingStatus message="Loading packing list..." />
      ) : null}
      {packingData.state === "error" ? (
        packingData.error === "Trip not found." ? (
          <TripNotFoundState />
        ) : (
          <PackingStatus message={packingData.error} />
        )
      ) : null}
      {packingData.state === "ready" ? (
        <>
          <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
            <p className="inline-flex items-center gap-2 rounded-full bg-tealSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-tealDeep">
              <PackagePlus aria-hidden="true" className="h-4 w-4" />
              Packing List
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
                  {packingData.data.trip.name}
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
                  Add, edit and check off packing items for this trip.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="min-h-11 rounded-lg bg-slateAccent px-4 py-3 text-sm font-semibold text-cream shadow-soft"
                  onClick={() => setShowAddForm((visible) => !visible)}
                  type="button"
                >
                  {showAddForm ? "Close form" : "Add item"}
                </button>
                <Link className="trip-action" to={`/trips/${packingData.data.trip.id}`}>
                  Trip overview
                </Link>
                <Link
                  className="trip-action"
                  to={`/trips/${packingData.data.trip.id}/templates`}
                >
                  Templates
                </Link>
              </div>
            </div>
          </div>

          <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <ProgressMetric label="Packed" value={`${progress.packedCount}`} />
              <ProgressMetric
                label="Packable"
                value={`${progress.packableCount}`}
              />
              <ProgressMetric
                label="Progress"
                value={`${progress.percentPacked}%`}
              />
              <ProgressMetric
                label="Not taking"
                value={`${progress.notTakingCount}`}
              />
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-cream">
              <div
                className="pp-progress-bar h-full rounded-full bg-teal"
                style={{ width: `${progress.percentPacked}%` }}
              />
            </div>
          </section>

          <QuickAddPackingItem
            defaultOwnership={quickAddOwnership}
            focusRequest={quickAddFocusRequest}
            key={`${quickAddOwnership.ownershipScope}:${quickAddOwnership.ownerTravellerId ?? ""}`}
            onSubmit={(input) =>
              refreshAfterQuickAdd(createPackingItem(input))
            }
            travellers={packingData.data.travellers}
            tripId={packingData.data.trip.id}
          />

          {showAddForm ? (
            <PackingItemForm
              bags={packingData.data.bags}
              categories={packingData.data.categories}
              travellers={packingData.data.travellers}
              tripId={packingData.data.trip.id}
              submitLabel="Add item"
              onCancel={() => setShowAddForm(false)}
              onSubmit={(input) => refreshAfter(createPackingItem(input))}
            />
          ) : null}

          <PackingFiltersPanel
            categories={packingData.data.categories}
            bags={packingData.data.bags}
            filters={filters}
            onChange={setFilters}
            travellers={packingData.data.travellers}
          />

          {packingData.data.items.length === 0 ? (
            <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
              <h2 className="text-xl font-semibold text-charcoal">
                No packing items yet
              </h2>
              <p className="mt-2 text-sm leading-6 text-charcoal/70">
                Start by adding the things you already know you need. You can
                assign each item to a traveller, mark it as shared, or leave it
                unassigned until you decide.
              </p>
              <button
                className="mt-5 min-h-12 rounded-lg bg-slateAccent px-5 text-sm font-semibold text-cream shadow-soft"
                onClick={() => setQuickAddFocusRequest((request) => request + 1)}
                type="button"
              >
                Add item
              </button>
            </section>
          ) : filteredItems.length === 0 ? (
            <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
              <h2 className="text-xl font-semibold text-charcoal">
                {filters.bagId === "__unassigned"
                  ? "No items have no bag assigned"
                  : "No items match these filters"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-charcoal/70">
                {filters.bagId === "__unassigned"
                  ? "Every packing item currently has a bag. You can clear an item's bag assignment at any time."
                  : "Clear the filters to return to the full packing list."}
              </p>
              <button
                className="trip-action mt-4 min-h-11"
                onClick={() => setFilters(emptyPackingFilters())}
                type="button"
              >
                Clear filters
              </button>
            </section>
          ) : (
            <div className="grid gap-4">
              {filteredItems.map((item) =>
                editingItemId === item.id ? (
                  <PackingItemForm
                    bags={packingData.data.bags}
                    categories={packingData.data.categories}
                    initialItem={item}
                    key={item.id}
                    travellers={packingData.data.travellers}
                    tripId={packingData.data.trip.id}
                    submitLabel="Save item"
                    onCancel={() => setEditingItemId(undefined)}
                    onSubmit={(input) =>
                      refreshAfter(updatePackingItem(item.id, input))
                    }
                  />
                ) : (
                  <PackingItemCard
                    item={item}
                    key={item.id}
                    onArchive={() => {
                      if (
                        window.confirm(
                          `Archive "${item.name}"? It will be removed from this packing list.`,
                        )
                      ) {
                        void refreshAfter(archivePackingItem(item.id));
                      }
                    }}
                    onEdit={() => setEditingItemId(item.id)}
                    onStatus={(status) =>
                      refreshAfter(updatePackingItemStatus(item.id, status))
                    }
                    bags={packingData.data.bags}
                    travellers={packingData.data.travellers}
                  />
                ),
              )}
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}

function PackingFiltersPanel({
  bags,
  categories,
  filters,
  onChange,
  travellers,
}: {
  categories: string[];
  bags: Bag[];
  filters: PackingFilters;
  onChange: (filters: PackingFilters) => void;
  travellers: Traveller[];
}) {
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const ownerOptions = [
    { value: "", label: "All" },
    ...travellers.map((traveller) => ({
      value: traveller.id,
      label: traveller.name,
    })),
    { value: SHARED_OWNERSHIP_FILTER, label: "Shared" },
    { value: UNASSIGNED_OWNERSHIP_FILTER, label: "Unassigned" },
  ];

  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">Filters</h2>
          <p className="mt-1 text-sm text-charcoal/65">
            {activeFilterCount === 0
              ? "Showing all packing items"
              : `${activeFilterCount} active ${activeFilterCount === 1 ? "filter" : "filters"}`}
          </p>
        </div>
        {activeFilterCount > 0 ? (
          <button
            className="trip-action min-h-11 justify-center"
            onClick={() => onChange(emptyPackingFilters())}
            type="button"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <fieldset className="mt-5 space-y-2">
        <legend className="text-sm font-medium text-charcoal">Ownership</legend>
        <div className="flex flex-wrap gap-2">
          {ownerOptions.map((option) => {
            const selected = filters.ownerTravellerId === option.value;
            return (
              <button
                aria-pressed={selected}
                className={`min-h-11 rounded-lg border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${
                  selected
                    ? "border-teal bg-tealSoft text-tealDeep"
                    : "border-charcoal/10 bg-cream text-charcoal"
                }`}
                key={option.value || "all"}
                onClick={() =>
                  onChange({ ...filters, ownerTravellerId: option.value })
                }
                type="button"
              >
                {selected ? <Check aria-hidden="true" className="mr-2 inline h-4 w-4" /> : null}
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Search</span>
          <input
            className="min-h-11 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            placeholder="Name, note, category or bag"
            value={filters.search}
            onChange={(event) =>
              onChange({ ...filters, search: event.target.value })
            }
          />
        </label>
        <FilterSelect
          label="Category"
          value={filters.category}
          onChange={(value) => onChange({ ...filters, category: value })}
          options={categories.map((category) => ({
            value: category,
            label: category,
          }))}
        />
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(value) => onChange({ ...filters, status: value })}
          options={packingStatusOptions}
        />
        <FilterSelect
          label="Priority"
          value={filters.priority}
          onChange={(value) => onChange({ ...filters, priority: value })}
          options={packingPriorityOptions}
        />
        <FilterSelect
          label="Bag"
          value={filters.bagId}
          onChange={(value) => onChange({ ...filters, bagId: value })}
          options={[
            { value: "__unassigned", label: "No bag assigned" },
            ...bags.map((bag) => ({ value: bag.id, label: bag.name })),
          ]}
        />
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  value: string;
}) {
  return (
    <label className="space-y-2 text-sm font-medium text-charcoal">
      <span>{label}</span>
      <select
        className="min-h-11 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PackingItemCard({
  item,
  onArchive,
  onEdit,
  onStatus,
  travellers,
  bags,
}: {
  item: PackingItem;
  onArchive: () => void;
  onEdit: () => void;
  onStatus: (status: PackingItem["status"]) => void;
  travellers: Traveller[];
  bags: Bag[];
}) {
  const owner = travellers.find(
    (traveller) => traveller.id === item.ownerTravellerId,
  );
  const responsible = travellers.find(
    (traveller) => traveller.id === item.responsibleTravellerId,
  );
  const isPacked = item.status === "packed";
  const isNotTaking = item.status === "not-taking";
  const statusLabel =
    packingStatusOptions.find((option) => option.value === item.status)?.label ??
    item.status;

  return (
    <article
      className={`rounded-lg border p-5 shadow-soft sm:p-6 ${
        isPacked
          ? "border-teal/35 bg-tealSoft/45"
          : isNotTaking
            ? "border-charcoal/15 bg-charcoal/5 opacity-75"
            : "border-charcoal/10 bg-paper"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-charcoal">
              {item.name}
            </h2>
            <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-charcoal/70">
              {statusLabel}
            </span>
          </div>
          <p className="mt-2 text-sm text-charcoal/70">
            {getOwnershipLabel(item, owner)} · {formatPackingLabel(item.category)}
            {item.quantity > 1 ? ` · Quantity ${item.quantity}` : ""} ·{" "}
            {formatPackingLabel(item.priority)}
          </p>
          {responsible ? (
            <p className="mt-1 text-sm text-charcoal/70">
              Responsible: {responsible.name}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-charcoal/70">
            Bag: {getBagName(bags, item.bagId)}
          </p>
          {item.notes ? (
            <p className="mt-2 text-sm leading-6 text-charcoal/70">
              {item.notes}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="trip-action"
            onClick={() => onStatus(isPacked ? "needed" : "packed")}
            type="button"
          >
            {isPacked ? "Mark unpacked" : "Mark packed"}
          </button>
          <button
            className="trip-action"
            onClick={() => onStatus("not-taking")}
            type="button"
          >
            Not taking
          </button>
          <button className="trip-action" onClick={onEdit} type="button">
            Edit
          </button>
          <button className="trip-action" onClick={onArchive} type="button">
            Archive
          </button>
        </div>
      </div>
    </article>
  );
}

function getOwnershipLabel(item: PackingItem, owner?: Traveller) {
  if (item.ownershipScope === "shared") {
    return "Shared";
  }

  if (item.ownershipScope === "unassigned") {
    return "Unassigned";
  }

  return owner?.name ?? "Unknown traveller";
}

function formatPackingLabel(value: string) {
  return value.replace(/-/g, " ");
}

function ProgressMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-cream p-4">
      <p className="text-sm font-medium text-charcoal/64">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-charcoal">{value}</p>
    </div>
  );
}

function PackingStatus({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 text-sm text-charcoal/70 shadow-soft">
      {message}
    </section>
  );
}

function emptyPackingFilters(): PackingFilters {
  return {
    ownerTravellerId: "",
    category: "",
    status: "",
    priority: "",
    bagId: "",
    search: "",
  };
}
