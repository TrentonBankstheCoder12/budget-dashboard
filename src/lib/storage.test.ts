import { describe, expect, it } from "vitest";
import { loadState, parsePersisted, saveState, STORAGE_KEY } from "./storage";

const valid = {
  transactions: [
    { id: "1", date: "2026-01-01", description: "x", amountCents: -100, category: "Dining", categorySource: "rule" as const },
  ],
  rules: [{ id: "r", keyword: "x", category: "Dining" }],
  budgets: { Dining: 1000 },
};

describe("storage", () => {
  it("round-trips through localStorage", () => {
    expect(saveState(valid)).toBe(true);
    expect(loadState()).toEqual({ version: 1, ...valid });
  });

  it("rejects corrupt or wrongly shaped data instead of crashing", () => {
    expect(parsePersisted("{not json")).toBeNull();
    expect(parsePersisted(JSON.stringify({ version: 2, ...valid }))).toBeNull();
    // A float amount would break cent math, so it is rejected.
    const floaty = { ...valid, transactions: [{ ...valid.transactions[0], amountCents: 1.5 }] };
    expect(parsePersisted(JSON.stringify({ version: 1, ...floaty }))).toBeNull();
  });

  it("survives a storage backend that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(loadState(broken)).toBeNull();
    expect(saveState(valid, broken)).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
