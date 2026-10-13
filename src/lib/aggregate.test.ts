import { describe, expect, it } from "vitest";
import { filterTransactions, listMonths, monthlySummary, savingsRate, spendingByCategory } from "./aggregate";
import { sumCents } from "./money";
import { generateSampleTransactions, mulberry32 } from "./sample";
import type { Transaction } from "./types";

let n = 0;
const tx = (date: string, description: string, amountCents: number, category: string): Transaction => ({
  id: `t${++n}`,
  date,
  description,
  amountCents,
  category,
  categorySource: "rule",
});

const data = [
  tx("2026-02-01", "Payroll", 300000, "Income"),
  tx("2026-02-03", "Rent", -150000, "Housing"),
  tx("2026-02-10", "Groceries run", -8000, "Groceries"),
  tx("2026-03-01", "Payroll", 300000, "Income"),
  tx("2026-03-02", "Amazon", -5000, "Shopping"),
  tx("2026-03-09", "Amazon refund", 2000, "Shopping"),
  tx("2026-03-12", "Trader Joe's", -6000, "Groceries"),
];

describe("filterTransactions", () => {
  it("filters by month, category and search, newest first", () => {
    expect(filterTransactions(data, { month: "2026-03", category: "all", search: "" }).map((t) => t.date)).toEqual([
      "2026-03-12",
      "2026-03-09",
      "2026-03-02",
      "2026-03-01",
    ]);
    expect(filterTransactions(data, { month: "all", category: "Groceries", search: "" })).toHaveLength(2);
    expect(filterTransactions(data, { month: "all", category: "all", search: "AMAZON" })).toHaveLength(2);
    // Search also matches the category name.
    expect(filterTransactions(data, { month: "all", category: "all", search: "housing" })).toHaveLength(1);
  });
});

describe("spendingByCategory", () => {
  it("nets refunds against their category and excludes income", () => {
    const march = data.filter((t) => t.date.startsWith("2026-03"));
    expect(spendingByCategory(march)).toEqual([
      { category: "Groceries", cents: 6000 },
      { category: "Shopping", cents: 3000 },
    ]);
  });
});

describe("monthlySummary", () => {
  it("summarizes income and expense per month in chronological order", () => {
    expect(monthlySummary(data)).toEqual([
      { month: "2026-02", incomeCents: 300000, expenseCents: 158000, netCents: 142000 },
      { month: "2026-03", incomeCents: 300000, expenseCents: 9000, netCents: 291000 },
    ]);
    expect(listMonths(data)).toEqual(["2026-03", "2026-02"]);
  });

  it("savingsRate handles zero income", () => {
    expect(savingsRate({ incomeCents: 200000, netCents: 50000 })).toBe(0.25);
    expect(savingsRate({ incomeCents: 0, netCents: -100 })).toBeNull();
  });

  // Property-style invariant: whatever the data, aggregation must not create or lose a cent.
  it("invariant: net per month equals the raw sum of that month's amounts, for random ledgers", () => {
    const rand = mulberry32(7);
    const categories = ["Income", "Dining", "Housing", "Shopping"];
    for (let trial = 0; trial < 50; trial++) {
      const txs = Array.from({ length: 1 + Math.floor(rand() * 60) }, (_, i) =>
        tx(
          `2026-0${1 + Math.floor(rand() * 6)}-1${Math.floor(rand() * 9)}`,
          `row ${i}`,
          Math.floor(rand() * 400001) - 200000 || 1,
          categories[Math.floor(rand() * categories.length)],
        ),
      );
      const summary = monthlySummary(txs);
      for (const s of summary) {
        const raw = sumCents(txs.filter((t) => t.date.startsWith(s.month)).map((t) => t.amountCents));
        expect(s.netCents).toBe(raw);
        expect(Number.isInteger(s.incomeCents) && Number.isInteger(s.expenseCents)).toBe(true);
      }
      expect(sumCents(summary.map((s) => s.netCents))).toBe(sumCents(txs.map((t) => t.amountCents)));
    }
  });
});

describe("sample data", () => {
  it("is deterministic and never includes future-dated transactions", () => {
    const today = new Date(2026, 9, 12);
    const a = generateSampleTransactions(today);
    const b = generateSampleTransactions(today);
    expect(a).toEqual(b);
    expect(listMonths(a)).toHaveLength(6);
    expect(a.every((t) => t.date <= "2026-10-12")).toBe(true);
    expect(a.every((t) => Number.isInteger(t.amountCents))).toBe(true);
  });
});
