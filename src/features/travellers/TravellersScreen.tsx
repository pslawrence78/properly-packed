import { UsersRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ensureDatabaseReady } from "../../db";
import type { Traveller, TravellerType } from "../../db/types";
import {
  createTraveller,
  listTravellers,
  updateTraveller,
} from "../../db/repositories/travellers-repository";
import { useAsyncData } from "../../hooks/use-async-data";

const travellerTypes: TravellerType[] = ["adult", "child", "dog"];

export function TravellersScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = getSafeReturnPath(searchParams.get("returnTo"));
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [showCreateForm, setShowCreateForm] = useState(
    () => searchParams.get("add") === "1",
  );
  const travellers = useAsyncData(async () => {
    await ensureDatabaseReady();
    return listTravellers();
  }, [refreshKey]);

  return (
    <section className="space-y-5">
      <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
        <p className="inline-flex items-center gap-2 rounded-full bg-tealSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-tealDeep">
          <UsersRound aria-hidden="true" className="h-4 w-4" />
          Travellers
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
          Travellers
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
          Add the real people or pets who are coming on your trips.
        </p>
        <div className="mt-5">
          <button
            className="trip-action bg-slateAccent text-cream"
            onClick={() => setShowCreateForm((visible) => !visible)}
            type="button"
          >
            {showCreateForm ? "Close form" : "Add traveller"}
          </button>
        </div>
      </div>

      {travellers.state === "loading" ? (
        <TravellerStatus message="Loading travellers..." />
      ) : null}
      {travellers.state === "error" ? (
        <TravellerStatus message={travellers.error} />
      ) : null}
      {travellers.state === "ready" ? (
        <div className="grid gap-4">
          {showCreateForm ? (
            <TravellerCreateForm
              onCancel={() => setShowCreateForm(false)}
              onSaved={() => {
                setShowCreateForm(false);
                setRefreshKey((key) => key + 1);
                if (returnTo) navigate(returnTo);
              }}
            />
          ) : null}
          {travellers.data.length === 0 ? (
            <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
              <h2 className="text-xl font-semibold text-charcoal">
                No travellers yet
              </h2>
              <p className="mt-2 text-sm leading-6 text-charcoal/70">
                Add at least one traveller before creating a trip.
              </p>
            </section>
          ) : null}
          {travellers.data.map((traveller) =>
            editingId === traveller.id ? (
              <TravellerEditForm
                key={traveller.id}
                onCancel={() => setEditingId(undefined)}
                onSaved={() => {
                  setEditingId(undefined);
                  setRefreshKey((key) => key + 1);
                }}
                traveller={traveller}
              />
            ) : (
              <article
                className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6"
                key={traveller.id}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-charcoal">
                      {traveller.name}
                    </h2>
                    <p className="mt-2 text-sm text-charcoal/70">
                      {traveller.travellerType} ·{" "}
                      {traveller.defaultIncluded
                        ? "included by default"
                        : "excluded by default"}
                    </p>
                    {traveller.notes ? (
                      <p className="mt-2 text-sm text-charcoal/70">
                        {traveller.notes}
                      </p>
                    ) : null}
                  </div>
                  <button
                    className="trip-action"
                    onClick={() => setEditingId(traveller.id)}
                    type="button"
                  >
                    Edit
                  </button>
                </div>
              </article>
            ),
          )}
        </div>
      ) : null}
    </section>
  );
}

function getSafeReturnPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

function TravellerCreateForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [travellerType, setTravellerType] = useState<TravellerType>("adult");
  const [defaultIncluded, setDefaultIncluded] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Traveller name is required.");
      return;
    }

    await createTraveller({
      name: name.trim(),
      travellerType,
      defaultIncluded,
      notes: notes.trim() || undefined,
    });
    onSaved();
  }

  return (
    <form
      aria-label="Add traveller"
      className="space-y-4 rounded-lg border border-teal/30 bg-paper p-5 shadow-soft sm:p-6"
      onSubmit={handleSubmit}
    >
      {error ? (
        <p className="rounded-lg border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-charcoal/80">
          {error}
        </p>
      ) : null}
      <TravellerFields
        defaultIncluded={defaultIncluded}
        name={name}
        notes={notes}
        travellerType={travellerType}
        onDefaultIncludedChange={setDefaultIncluded}
        onNameChange={setName}
        onNotesChange={setNotes}
        onTravellerTypeChange={setTravellerType}
      />
      <div className="flex flex-wrap gap-2">
        <button className="trip-action" type="submit">
          Save traveller
        </button>
        <button className="trip-action" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </form>
  );
}

function TravellerEditForm({
  onCancel,
  onSaved,
  traveller,
}: {
  onCancel: () => void;
  onSaved: () => void;
  traveller: Traveller;
}) {
  const [name, setName] = useState(traveller.name);
  const [travellerType, setTravellerType] = useState<TravellerType>(
    traveller.travellerType,
  );
  const [defaultIncluded, setDefaultIncluded] = useState(
    traveller.defaultIncluded,
  );
  const [notes, setNotes] = useState(traveller.notes ?? "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await updateTraveller(traveller.id, {
      name: name.trim(),
      travellerType,
      defaultIncluded,
      notes: notes.trim() || undefined,
    });
    onSaved();
  }

  return (
    <form
      className="space-y-4 rounded-lg border border-teal/30 bg-paper p-5 shadow-soft sm:p-6"
      onSubmit={handleSubmit}
    >
      <TravellerFields
        defaultIncluded={defaultIncluded}
        name={name}
        notes={notes}
        travellerType={travellerType}
        onDefaultIncludedChange={setDefaultIncluded}
        onNameChange={setName}
        onNotesChange={setNotes}
        onTravellerTypeChange={setTravellerType}
      />

      <div className="flex flex-wrap gap-2">
        <button className="trip-action" type="submit">
          Save traveller
        </button>
        <button className="trip-action" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </form>
  );
}

function TravellerFields({
  defaultIncluded,
  name,
  notes,
  onDefaultIncludedChange,
  onNameChange,
  onNotesChange,
  onTravellerTypeChange,
  travellerType,
}: {
  defaultIncluded: boolean;
  name: string;
  notes: string;
  onDefaultIncludedChange: (value: boolean) => void;
  onNameChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onTravellerTypeChange: (value: TravellerType) => void;
  travellerType: TravellerType;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Name</span>
          <input
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-charcoal">
          <span>Traveller type</span>
          <select
            className="min-h-12 w-full rounded-lg border border-charcoal/15 bg-cream px-3 text-base outline-none focus:border-teal"
            value={travellerType}
            onChange={(event) =>
              onTravellerTypeChange(event.target.value as TravellerType)
            }
          >
            {travellerTypes.map((type) => (
              <option key={type} value={type}>
                {type === "dog" ? "dog/pet" : type}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex min-h-12 items-center gap-3 rounded-lg border border-charcoal/10 bg-cream px-4 text-sm font-medium text-charcoal">
        <input
          className="h-5 w-5 accent-teal"
          checked={defaultIncluded}
          onChange={(event) => onDefaultIncludedChange(event.target.checked)}
          type="checkbox"
        />
        Included by default
      </label>

      <label className="block space-y-2 text-sm font-medium text-charcoal">
        <span>Notes</span>
        <textarea
          className="min-h-24 w-full rounded-lg border border-charcoal/15 bg-cream px-3 py-3 text-base outline-none focus:border-teal"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
        />
      </label>
    </>
  );
}

function TravellerStatus({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 text-sm text-charcoal/70 shadow-soft">
      {message}
    </section>
  );
}
