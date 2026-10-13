import type { Budgets, Rule, Transaction } from "./types";

/**
 * localStorage persistence. Every access is wrapped in try/catch because
 * storage can throw (Safari private mode, quota exceeded, disabled cookies)
 * and the dashboard must keep working in memory when it does.
 */

export interface PersistedState {
  version: 1;
  transactions: Transaction[];
  rules: Rule[];
  budgets: Budgets;
}

export const STORAGE_KEY = "budget-dashboard:v1";

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

function isTransaction(v: unknown): v is Transaction {
  return (
    isObject(v) &&
    typeof v.id === "string" &&
    typeof v.date === "string" &&
    typeof v.description === "string" &&
    Number.isInteger(v.amountCents) &&
    typeof v.category === "string" &&
    (v.categorySource === "rule" || v.categorySource === "manual" || v.categorySource === "import")
  );
}

function isRule(v: unknown): v is Rule {
  return isObject(v) && typeof v.id === "string" && typeof v.keyword === "string" && typeof v.category === "string";
}

/** Validate untrusted JSON. Anything malformed is treated as "no saved state". */
export function parsePersisted(raw: string | null): PersistedState | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isObject(data) || data.version !== 1) return null;
    if (!Array.isArray(data.transactions) || !data.transactions.every(isTransaction)) return null;
    if (!Array.isArray(data.rules) || !data.rules.every(isRule)) return null;
    if (!isObject(data.budgets) || !Object.values(data.budgets).every((c) => Number.isInteger(c))) return null;
    return data as unknown as PersistedState;
  } catch {
    return null;
  }
}

export function loadState(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): PersistedState | null {
  try {
    return parsePersisted(storage?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

/** Returns false when the write failed so the UI can tell the user changes are not being saved. */
export function saveState(
  state: Omit<PersistedState, "version">,
  storage: Pick<Storage, "setItem"> | undefined = globalThis.localStorage,
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...state }));
    return true;
  } catch {
    return false;
  }
}

export function clearState(storage: Pick<Storage, "removeItem"> | undefined = globalThis.localStorage): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do: if storage is unavailable there is nothing saved either.
  }
}
