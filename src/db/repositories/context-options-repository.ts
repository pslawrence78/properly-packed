import {
  contextOptionTypes,
  normaliseContextLabel,
} from "../context-options";
import type { ProperlyPackedDatabase } from "../schema";
import { appDb } from "../schema";
import type { ContextOption, ContextOptionType } from "../types";

export type ContextOptionInput = {
  type: ContextOptionType;
  label: string;
  description?: string;
  sortOrder?: number;
};

export async function listContextOptions(
  db: ProperlyPackedDatabase = appDb,
) {
  return sortOptions(await db.contextOptions.toArray());
}

export async function listContextOptionsByType(
  type: ContextOptionType,
  db: ProperlyPackedDatabase = appDb,
) {
  return sortOptions(await db.contextOptions.where("type").equals(type).toArray());
}

export async function listActiveContextOptionsByType(
  type: ContextOptionType,
  db: ProperlyPackedDatabase = appDb,
) {
  return (await listContextOptionsByType(type, db)).filter(
    (option) => option.active && !option.archivedAt,
  );
}

export async function createContextOption(
  input: ContextOptionInput,
  db: ProperlyPackedDatabase = appDb,
) {
  validateType(input.type);
  const label = cleanLabel(input.label);
  await assertNoActiveDuplicate(input.type, label, undefined, db);
  const now = new Date().toISOString();
  const option: ContextOption = {
    id: createId("context-option"),
    type: input.type,
    label,
    description: input.description?.trim() || undefined,
    active: true,
    sortOrder:
      input.sortOrder ?? (await getNextSortOrder(input.type, db)),
    createdAt: now,
    updatedAt: now,
    userModifiedAt: now,
  };

  await db.contextOptions.add(option);
  return option;
}

export async function updateContextOption(
  id: string,
  updates: Partial<Pick<ContextOption, "label" | "description" | "sortOrder">>,
  db: ProperlyPackedDatabase = appDb,
) {
  const existing = await db.contextOptions.get(id);
  if (!existing) {
    throw new Error("Context option not found.");
  }

  const label = updates.label === undefined ? existing.label : cleanLabel(updates.label);
  if (existing.active) {
    await assertNoActiveDuplicate(existing.type, label, id, db);
  }
  const now = new Date().toISOString();
  await db.contextOptions.update(id, {
    ...updates,
    label,
    description:
      updates.description === undefined
        ? existing.description
        : updates.description.trim() || undefined,
    updatedAt: now,
    userModifiedAt: now,
  });
  return db.contextOptions.get(id);
}

export async function deactivateContextOption(
  id: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const now = new Date().toISOString();
  await db.contextOptions.update(id, {
    active: false,
    archivedAt: now,
    updatedAt: now,
    userModifiedAt: now,
  });
}

export async function reactivateContextOption(
  id: string,
  db: ProperlyPackedDatabase = appDb,
) {
  const existing = await db.contextOptions.get(id);
  if (!existing) {
    throw new Error("Context option not found.");
  }
  await assertNoActiveDuplicate(existing.type, existing.label, id, db);
  const now = new Date().toISOString();
  await db.contextOptions.update(id, {
    active: true,
    archivedAt: undefined,
    updatedAt: now,
    userModifiedAt: now,
  });
}

export async function findContextOptionBySeedKey(
  seedKey: string,
  db: ProperlyPackedDatabase = appDb,
) {
  return db.contextOptions.where("seedKey").equals(seedKey).first();
}

export async function findOrCreateContextOptionByLabel(
  type: ContextOptionType,
  labelValue: string,
  db: ProperlyPackedDatabase = appDb,
) {
  validateType(type);
  const label = cleanLabel(labelValue);
  const normalised = normaliseContextLabel(label);
  const existing = (await db.contextOptions.where("type").equals(type).toArray()).find(
    (option) => normaliseContextLabel(option.label) === normalised,
  );
  return existing ?? createContextOption({ type, label }, db);
}

function cleanLabel(label: string) {
  const cleaned = label.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    throw new Error("Context label is required.");
  }
  return cleaned;
}

async function assertNoActiveDuplicate(
  type: ContextOptionType,
  label: string,
  excludedId: string | undefined,
  db: ProperlyPackedDatabase,
) {
  const normalised = normaliseContextLabel(label);
  const duplicate = (await db.contextOptions.where("type").equals(type).toArray()).find(
    (option) =>
      option.id !== excludedId &&
      option.active &&
      !option.archivedAt &&
      normaliseContextLabel(option.label) === normalised,
  );
  if (duplicate) {
    throw new Error(`A ${type} option named "${label}" already exists.`);
  }
}

function validateType(type: ContextOptionType) {
  if (!contextOptionTypes.includes(type)) {
    throw new Error("Context type is invalid.");
  }
}

async function getNextSortOrder(
  type: ContextOptionType,
  db: ProperlyPackedDatabase,
) {
  const options = await db.contextOptions.where("type").equals(type).toArray();
  return options.reduce((highest, option) => Math.max(highest, option.sortOrder), -1) + 1;
}

function sortOptions(options: ContextOption[]) {
  return options.sort(
    (a, b) =>
      a.type.localeCompare(b.type) ||
      a.sortOrder - b.sortOrder ||
      a.label.localeCompare(b.label),
  );
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
