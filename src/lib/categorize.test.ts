import { describe, expect, it } from "vitest";
import { applyRules, categorize, DEFAULT_RULES } from "./categorize";
import type { Rule, Transaction } from "./types";

const rules: Rule[] = [
  { id: "1", keyword: "uber eats", category: "Dining" },
  { id: "2", keyword: "uber", category: "Transport" },
];

const tx = (over: Partial<Transaction>): Transaction => ({
  id: "t",
  date: "2026-03-01",
  description: "UBER EATS 123",
  amountCents: -2500,
  category: "Uncategorized",
  categorySource: "rule",
  ...over,
});

describe("categorize", () => {
  it("matches case-insensitively and the first matching rule wins", () => {
    expect(categorize("UBER EATS 123", -2500, rules)).toBe("Dining");
    expect(categorize("Uber Trip", -1200, rules)).toBe("Transport");
  });

  it("falls back to Income for unmatched inflows and Uncategorized for outflows", () => {
    expect(categorize("Venmo from Sam", 4000, rules)).toBe("Income");
    expect(categorize("Mystery shop", -4000, rules)).toBe("Uncategorized");
  });

  it("ignores blank keywords instead of matching everything", () => {
    expect(categorize("anything", -100, [{ id: "x", keyword: "  ", category: "Oops" }])).toBe("Uncategorized");
  });

  it("default rules put food delivery under Dining, not Transport", () => {
    expect(categorize("Uber Eats order", -3000, DEFAULT_RULES)).toBe("Dining");
  });
});

describe("applyRules", () => {
  it("recategorizes rule-sourced transactions but preserves manual and imported choices", () => {
    const manual = tx({ id: "m", category: "Groceries", categorySource: "manual" });
    const imported = tx({ id: "i", category: "Gifts", categorySource: "import" });
    const auto = tx({ id: "a" });
    const [m, i, a] = applyRules([manual, imported, auto], [{ id: "r", keyword: "uber eats", category: "Takeout" }]);
    expect(m).toBe(manual);
    expect(i).toBe(imported);
    expect(a.category).toBe("Takeout");
  });

  it("returns the same object when nothing changed, so React can skip re-renders", () => {
    const t = tx({ category: "Dining" });
    expect(applyRules([t], rules)[0]).toBe(t);
  });
});
