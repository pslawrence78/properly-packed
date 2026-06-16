import type { ProperlyPackedDatabase } from "../schema";
import { appDb } from "../schema";
import type { Traveller } from "../types";

export type TravellerInput = Pick<
  Traveller,
  "name" | "travellerType" | "defaultIncluded"
> &
  Partial<
    Pick<Traveller, "icon" | "colour" | "notes" | "archivedAt" | "seedKey">
  >;

export async function listTravellers(db: ProperlyPackedDatabase = appDb) {
  return db.travellers.orderBy("name").toArray();
}

export async function listDefaultTravellers(db: ProperlyPackedDatabase = appDb) {
  return listTravellers(db).then((travellers) =>
    travellers.filter((traveller) => traveller.defaultIncluded),
  );
}

export async function getTraveller(
  id: string,
  db: ProperlyPackedDatabase = appDb,
) {
  return db.travellers.get(id);
}

export async function createTraveller(
  input: TravellerInput,
  db: ProperlyPackedDatabase = appDb,
) {
  const now = new Date().toISOString();
  const traveller: Traveller = {
    id: createId("traveller"),
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  await db.travellers.add(traveller);
  return traveller;
}

export async function updateTraveller(
  id: string,
  updates: Partial<TravellerInput>,
  db: ProperlyPackedDatabase = appDb,
) {
  const updatedAt = new Date().toISOString();
  await db.travellers.update(id, {
    ...updates,
    updatedAt,
    userModifiedAt: updatedAt,
  });
  return getTraveller(id, db);
}

export async function deleteTraveller(
  id: string,
  db: ProperlyPackedDatabase = appDb,
) {
  await db.travellers.delete(id);
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }

  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
