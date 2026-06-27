import { Check, ChevronDown, Pencil, PackagePlus, X } from "lucide-react";
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
  buildPackingGroups,
  filterPackingItems,
  formatPackingLabel,
  getPackingStatusLabel,
  UNASSIGNED_BAG_FILTER,
  type PackViewMode,
  type PackingGroup,
  type QuickAddContextDefault,
  getQuickAddOwnershipDefault,
  packingPriorityOptions,
  packingFiltersFromSearchParams,
  packingStatusOptions,
  SHARED_OWNERSHIP_FILTER,
  type PackingFilters,
  UNASSIGNED_OWNERSHIP_FILTER,
} from "./packing-item-utils";
import { getBagName } from "../bags/bag-utils";

export function PackingListScreen() {
  const { tripId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [quickAddFocusRequest, setQuickAddFocusRequest] = useState(0);
  const [quickAddContextOverride, setQuickAddContextOverride] =
    useState<QuickAddContextDefault>();
  const [editingItemId, setEditingItemId] = useState<string | undefined>();
  const [filters, setFilters] = useState<PackingFilters>(emptyPackingFilters);
  const [viewMode, setViewMode] = useState<PackViewMode>("person");

  useEffect(() => {
    setFilters(packingFiltersFromSearchParams(searchParams));
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

  useEffect(() => {
    if (packingData.state !== "ready") return;
    const validOwners = new Set([
      SHARED_OWNERSHIP_FILTER,
      UNASSIGNED_OWNERSHIP_FILTER,
      ...packingData.data.travellers.map((traveller) => traveller.id),
    ]);
    const validBags = new Set([
      UNASSIGNED_BAG_FILTER,
      ...packingData.data.bags.map((bag) => bag.id),
    ]);
    setFilters((current) => ({
      ...current,
      ownerTravellerId:
        current.ownerTravellerId && !validOwners.has(current.ownerTravellerId)
          ? ""
          : current.ownerTravellerId,
      bagId: current.bagId && !validBags.has(current.bagId) ? "" : current.bagId,
    }));
  }, [packingData]);

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

  const quickAddContext = useMemo<QuickAddContextDefault>(() => {
    if (quickAddContextOverride) {
      return quickAddContextOverride;
    }
    const base = quickAddOwnership;
    return {
      ...base,
      category: filters.category || undefined,
      bagId:
        filters.bagId && filters.bagId !== UNASSIGNED_BAG_FILTER
          ? filters.bagId
          : undefined,
      status: isQuickAddStatus(filters.status) ? filters.status : undefined,
    };
  }, [filters, quickAddContextOverride, quickAddOwnership]);

  const packingGroups = useMemo(() => {
    if (packingData.state !== "ready") {
      return [];
    }

    return buildPackingGroups({
      bags: packingData.data.bags,
      items: filteredItems,
      travellers: packingData.data.travellers,
      viewMode,
    });
  }, [filteredItems, packingData, viewMode]);

  async function refreshAfter(action: Promise<unknown>) {
    await action;
    setShowAddForm(false);
    setEditingItemId(undefined);
    setRefreshKey((key) => key + 1);
  }

  async function refreshAfterQuickAdd(action: Promise<unknown>) {
    await action;
    setQuickAddContextOverride(undefined);
    setRefreshKey((key) => key + 1);
  }

  function clearFilters() {
    setFilters(emptyPackingFilters());
    setSearchParams({});
  }

  function focusQuickAdd(context?: QuickAddContextDefault) {
    setQuickAddContextOverride(context);
    setQuickAddFocusRequest((request) => request + 1);
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
                  {showAddForm ? "Close form" : "Detailed add"}
                </button>
                <Link className="trip-action" to={`/trips/${packingData.data.trip.id}`}>
                  Trip overview
                </Link>
                <Link
                  className="trip-action"
                  to={`/trips/${packingData.data.trip.id}/starter-pack`}
                >
                  Review suggestions
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
            defaultContext={quickAddContext}
            focusRequest={quickAddFocusRequest}
            key={`${quickAddContext.ownershipScope}:${quickAddContext.ownerTravellerId ?? ""}:${quickAddContext.category ?? ""}:${quickAddContext.bagId ?? ""}:${quickAddContext.status ?? ""}`}
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
              initialDefaults={
                {
                  ownershipScope: quickAddContext.ownershipScope,
                  ownerTravellerId: quickAddContext.ownerTravellerId,
                  category: quickAddContext.category ?? "misc",
                  priority: "important",
                  status: quickAddContext.status ?? "needed",
                  bagId: quickAddContext.bagId,
                }
              }
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
            onChange={(nextFilters) => {
              setQuickAddContextOverride(undefined);
              setFilters(nextFilters);
            }}
            onClear={clearFilters}
            travellers={packingData.data.travellers}
          />

          <PackViewSwitcher value={viewMode} onChange={setViewMode} />

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
                onClick={() => focusQuickAdd()}
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
                onClick={clearFilters}
                type="button"
              >
                Clear filters
              </button>
            </section>
          ) : (
            <PackingGroups
              bags={packingData.data.bags}
              categories={packingData.data.categories}
              editingItemId={editingItemId}
              groups={packingGroups}
              onArchive={(item) => {
                if (
                  window.confirm(
                    `Archive "${item.name}"? It will be removed from this packing list.`,
                  )
                ) {
                  void refreshAfter(archivePackingItem(item.id));
                }
              }}
              onEdit={setEditingItemId}
              onQuickAdd={focusQuickAdd}
              onStatus={(item, status) =>
                refreshAfter(updatePackingItemStatus(item.id, status))
              }
              onSubmitEdit={(item, input) =>
                refreshAfter(updatePackingItem(item.id, input))
              }
              onCancelEdit={() => setEditingItemId(undefined)}
              travellers={packingData.data.travellers}
              tripId={packingData.data.trip.id}
              viewMode={viewMode}
            />
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
  onClear,
  travellers,
}: {
  categories: string[];
  bags: Bag[];
  filters: PackingFilters;
  onChange: (filters: PackingFilters) => void;
  onClear: () => void;
  travellers: Traveller[];
}) {
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const filterChips = getActiveFilterChips(filters, travellers, bags);
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
            onClick={onClear}
            type="button"
          >
            Clear filters
          </button>
        ) : null}
      </div>
      {filterChips.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Active filters">
          {filterChips.map((chip) => (
            <span
              className="rounded-full bg-tealSoft px-3 py-1 text-xs font-semibold text-tealDeep"
              key={chip}
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}

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
            { value: UNASSIGNED_BAG_FILTER, label: "No bag assigned" },
            ...bags.map((bag) => ({ value: bag.id, label: bag.name })),
          ]}
        />
      </div>
      <label className="mt-4 flex min-h-11 items-center gap-3 rounded-lg bg-cream px-4 text-sm font-medium text-charcoal">
        <input
          checked={filters.outstanding}
          className="h-5 w-5 accent-teal"
          onChange={(event) => onChange({ ...filters, outstanding: event.target.checked })}
          type="checkbox"
        />
        Outstanding items only
      </label>
    </section>
  );
}

function PackViewSwitcher({
  onChange,
  value,
}: {
  onChange: (mode: PackViewMode) => void;
  value: PackViewMode;
}) {
  const modes: { value: PackViewMode; label: string }[] = [
    { value: "person", label: "By Person" },
    { value: "category", label: "By Category" },
    { value: "bag", label: "By Bag" },
    { value: "action", label: "By Action" },
    { value: "flat", label: "Flat List" },
  ];

  return (
    <section
      aria-label="Pack view mode"
      className="rounded-lg border border-charcoal/10 bg-paper p-3 shadow-soft"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {modes.map((mode) => {
          const selected = value === mode.value;
          return (
            <button
              aria-pressed={selected}
              className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${
                selected
                  ? "bg-slateAccent text-cream"
                  : "bg-cream text-charcoal hover:bg-tealSoft"
              }`}
              key={mode.value}
              onClick={() => onChange(mode.value)}
              type="button"
            >
              {mode.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PackingGroups({
  bags,
  categories,
  editingItemId,
  groups,
  onArchive,
  onCancelEdit,
  onEdit,
  onQuickAdd,
  onStatus,
  onSubmitEdit,
  travellers,
  tripId,
  viewMode,
}: {
  bags: Bag[];
  categories: string[];
  editingItemId?: string;
  groups: PackingGroup[];
  onArchive: (item: PackingItem) => void;
  onCancelEdit: () => void;
  onEdit: (itemId: string) => void;
  onQuickAdd: (context?: QuickAddContextDefault) => void;
  onStatus: (item: PackingItem, status: PackingItem["status"]) => void;
  onSubmitEdit: (
    item: PackingItem,
    input: Parameters<typeof updatePackingItem>[1],
  ) => Promise<void>;
  travellers: Traveller[];
  tripId: string;
  viewMode: PackViewMode;
}) {
  if (groups.length === 0) {
    return (
      <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
        <h2 className="text-xl font-semibold text-charcoal">
          Nothing in this view yet
        </h2>
        <p className="mt-2 text-sm leading-6 text-charcoal/70">
          Try another Pack view or add an item from the quick add box above.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {viewMode === "action" ? (
        <p className="rounded-lg bg-cream px-4 py-3 text-sm leading-6 text-charcoal/70">
          Action groups are working views, so an item can appear in more than
          one group when it needs attention in more than one way.
        </p>
      ) : null}
      {groups.map((group) => (
        <details
          className="rounded-lg border border-charcoal/10 bg-paper shadow-soft"
          key={group.id}
          open
        >
          <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal sm:flex-row sm:items-center sm:justify-between sm:p-5 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ChevronDown aria-hidden="true" className="h-4 w-4 text-charcoal/55" />
                <h2 className="text-xl font-semibold text-charcoal">
                  {group.title}
                </h2>
                {group.subtitle ? (
                  <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-charcoal/65">
                    {group.subtitle}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-charcoal/68">
                {group.progress.packedCount} / {group.progress.packableCount} packed
                {group.essentialOutstandingCount > 0
                  ? ` / ${group.essentialOutstandingCount} essentials left`
                  : ""}
                {group.actionCount > 0 ? ` / ${group.actionCount} actions` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="trip-action min-h-11 justify-center"
                onClick={(event) => {
                  event.preventDefault();
                  onQuickAdd(group.quickAddDefault);
                }}
                type="button"
              >
                Add here
              </button>
              <span className="rounded-full bg-tealSoft px-3 py-1 text-sm font-bold text-tealDeep">
                {group.outstandingCount} left
              </span>
            </div>
          </summary>
          {group.items.length === 0 ? (
            <div className="border-t border-charcoal/10 p-5 text-sm leading-6 text-charcoal/70">
              Everything in this group is packed or there is nothing assigned
              here yet.
            </div>
          ) : (
            <div className="divide-y divide-charcoal/10 border-t border-charcoal/10">
              {group.items.map((item) =>
                editingItemId === item.id ? (
                  <div className="p-4 sm:p-5" key={item.id}>
                    <PackingItemForm
                      bags={bags}
                      categories={categories}
                      initialItem={item}
                      travellers={travellers}
                      tripId={tripId}
                      submitLabel="Save item"
                      onCancel={onCancelEdit}
                      onSubmit={(input) => onSubmitEdit(item, input)}
                    />
                  </div>
                ) : (
                  <PackingItemRow
                    bags={bags}
                    item={item}
                    key={item.id}
                    onArchive={() => onArchive(item)}
                    onEdit={() => onEdit(item.id)}
                    onStatus={(status) => onStatus(item, status)}
                    travellers={travellers}
                  />
                ),
              )}
            </div>
          )}
        </details>
      ))}
    </div>
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

function PackingItemRow({
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
  const statusLabel = getPackingStatusLabel(item.status);

  return (
    <article
      className={`p-4 sm:p-5 ${
        isPacked
          ? "bg-tealSoft/45"
          : isNotTaking
            ? "bg-charcoal/5 opacity-75"
            : "bg-paper"
      }`}
    >
      <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
        <button
          aria-label={isPacked ? `Mark ${item.name} not packed` : `Mark ${item.name} packed`}
          aria-pressed={isPacked}
          className={`flex min-h-14 w-full items-center justify-center rounded-lg border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal sm:w-16 ${
            isPacked
              ? "border-teal bg-teal text-cream"
              : "border-charcoal/15 bg-cream text-charcoal hover:border-teal"
          }`}
          onClick={() => onStatus(isPacked ? "needed" : "packed")}
          type="button"
        >
          <Check aria-hidden="true" className="h-5 w-5" />
          <span className="ml-2 sm:sr-only">{isPacked ? "Packed" : "Pack"}</span>
        </button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold leading-7 text-charcoal sm:text-xl">
              {item.name}
            </h3>
            {item.priority === "essential" ? (
              <span className="rounded-full bg-clay/15 px-2.5 py-1 text-xs font-bold text-charcoal">
                Essential
              </span>
            ) : null}
            <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-charcoal/70">
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-charcoal/70">
            {getOwnershipLabel(item, owner)} / {formatPackingLabel(item.category)} /{" "}
            {getBagName(bags, item.bagId)}
            {item.quantity > 1 ? ` / Qty ${item.quantity}` : ""} /{" "}
            {formatPackingLabel(item.priority)}
          </p>
          {responsible ? (
            <p className="mt-1 text-sm text-charcoal/70">
              Responsible: {responsible.name}
            </p>
          ) : null}
          {item.notes ? (
            <p className="mt-2 text-sm leading-6 text-charcoal/70">
              {item.notes}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <button
            aria-label={`Mark ${item.name} not taking`}
            className="trip-action min-h-11 justify-center"
            onClick={() => onStatus("not-taking")}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4 sm:mr-1" />
            <span className="sr-only sm:not-sr-only">Not taking</span>
          </button>
          <button
            aria-label={`Edit ${item.name}`}
            className="trip-action min-h-11 justify-center"
            onClick={onEdit}
            type="button"
          >
            <Pencil aria-hidden="true" className="h-4 w-4 sm:mr-1" />
            <span className="sr-only sm:not-sr-only">Edit</span>
          </button>
          <button
            className="trip-action min-h-11 justify-center"
            onClick={onArchive}
            type="button"
          >
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

function getActiveFilterChips(
  filters: PackingFilters,
  travellers: Traveller[],
  bags: Bag[],
) {
  const chips: string[] = [];
  const traveller = travellers.find(
    (entry) => entry.id === filters.ownerTravellerId,
  );
  const bag = bags.find((entry) => entry.id === filters.bagId);

  if (filters.ownerTravellerId === SHARED_OWNERSHIP_FILTER) {
    chips.push("Owner: Shared");
  } else if (filters.ownerTravellerId === UNASSIGNED_OWNERSHIP_FILTER) {
    chips.push("Owner: Unassigned");
  } else if (traveller) {
    chips.push(`Owner: ${traveller.name}`);
  }

  if (filters.category) chips.push(`Category: ${formatPackingLabel(filters.category)}`);
  if (filters.status) chips.push(`Status: ${getPackingStatusLabel(filters.status as PackingItem["status"])}`);
  if (filters.priority) chips.push(`Priority: ${formatPackingLabel(filters.priority)}`);
  if (filters.bagId === UNASSIGNED_BAG_FILTER) {
    chips.push("Bag: No bag assigned");
  } else if (bag) {
    chips.push(`Bag: ${bag.name}`);
  }
  if (filters.search) chips.push(`Search: ${filters.search}`);
  if (filters.outstanding) chips.push("Outstanding only");

  return chips;
}

function isQuickAddStatus(status: string): status is PackingItem["status"] {
  return ["to-buy", "to-wash", "to-charge", "to-download", "to-decide", "needed"].includes(status);
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
    outstanding: false,
  };
}
