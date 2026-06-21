import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { normaliseContextLabel } from "../db/context-options";
import {
  createContextOption,
  deactivateContextOption,
  listActiveContextOptionsByType,
  listContextOptionsByType,
  reactivateContextOption,
  updateContextOption,
} from "../db/repositories/context-options-repository";
import { ProperlyPackedDatabase } from "../db/schema";
import { applyInitialSeed } from "../db/seed";

const databases: ProperlyPackedDatabase[] = [];
const legacyDatabases: Dexie[] = [];

function createDatabase(name = `properly-packed-test-${crypto.randomUUID()}`) {
  const db = new ProperlyPackedDatabase(name);
  databases.push(db);
  return db;
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map(async (db) => {
    db.close();
    await db.delete();
  }));
  await Promise.all(legacyDatabases.splice(0).map(async (db) => {
    db.close();
    await db.delete();
  }));
});

describe("context options", () => {
  it("normalises labels without losing meaningful punctuation", () => {
    expect(normaliseContextLabel("  Theme   Park  ")).toBe("theme park");
    expect(normaliseContextLabel("Kids' clubs")).toBe("kids' clubs");
  });

  it("creates, edits, deactivates and reactivates options", async () => {
    const db = createDatabase();
    const created = await createContextOption(
      { type: "activity", label: "  Museum   day ", description: "Indoor visit" },
      db,
    );
    expect(created).toMatchObject({ label: "Museum day", active: true });

    await updateContextOption(created.id, { label: "Gallery day" }, db);
    await deactivateContextOption(created.id, db);
    expect(await listActiveContextOptionsByType("activity", db)).toEqual([]);
    expect(await listContextOptionsByType("activity", db)).toMatchObject([
      { label: "Gallery day", active: false },
    ]);

    await reactivateContextOption(created.id, db);
    expect(await listActiveContextOptionsByType("activity", db)).toMatchObject([
      { label: "Gallery day", active: true },
    ]);
  });

  it("prevents active duplicates within one type but permits the label in another", async () => {
    const db = createDatabase();
    await createContextOption({ type: "activity", label: "Theme Park" }, db);
    await expect(
      createContextOption({ type: "activity", label: " theme   park " }, db),
    ).rejects.toThrow("already exists");
    await expect(
      createContextOption({ type: "transport", label: "Theme Park" }, db),
    ).resolves.toMatchObject({ type: "transport" });
    await expect(
      createContextOption({ type: "activity", label: "   " }, db),
    ).rejects.toThrow("required");
  });

  it("seeds once and preserves a modified seeded option", async () => {
    const db = createDatabase();
    const first = await applyInitialSeed(db, () => "2026-06-17T00:00:00.000Z");
    const warm = await db.contextOptions.where("seedKey").equals("context-option:climate:warm").first();
    expect(first.contextOptionsInserted).toBe(57);
    expect(warm).toBeDefined();

    await updateContextOption(warm!.id, { label: "Warm and sunny" }, db);
    await deactivateContextOption(warm!.id, db);
    const second = await applyInitialSeed(db, () => "2026-06-18T00:00:00.000Z");

    expect(second.contextOptionsInserted).toBe(0);
    expect(await db.contextOptions.count()).toBe(57);
    expect(await db.contextOptions.get(warm!.id)).toMatchObject({
      label: "Warm and sunny",
      active: false,
    });
  });

  it("migrates legacy trip context labels to shared context IDs", async () => {
    const name = `properly-packed-legacy-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacyDatabases.push(legacy);
    legacy.version(3).stores({ trips: "id" });
    await legacy.table("trips").bulkAdd([
      legacyTrip("trip:1"),
      legacyTrip("trip:2"),
    ]);
    legacy.close();

    const upgraded = createDatabase(name);
    await upgraded.open();
    const trips = await upgraded.trips.toArray();
    const options = await upgraded.contextOptions.toArray();

    expect(options.filter((option) => option.label === "Cruise cabin")).toHaveLength(1);
    expect(trips[0].climateContextIds).toHaveLength(1);
    expect(trips[0].accommodationContextIds).toEqual(trips[1].accommodationContextIds);
    expect(trips[0].transportContextIds).toHaveLength(1);
    expect(trips[0].activityContextIds).toHaveLength(2);
  });
});

function legacyTrip(id: string) {
  return {
    id,
    name: "Legacy cruise",
    tripType: "cruise",
    startDate: "2026-08-01",
    endDate: "2026-08-08",
    nights: 7,
    destinations: ["Rome, Italy"],
    climateProfile: "Warm",
    accommodationTypes: ["Cruise cabin"],
    transportModes: ["Flight"],
    activityContexts: ["Pool", "Long travel day"],
    travellerIds: ["traveller:1"],
    status: "planning",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}
