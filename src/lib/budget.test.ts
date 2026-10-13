import { describe, expect, it } from "vitest";
import { budgetPace, budgetProgress, budgetStatus, budgetTotals, daysInMonth } from "./budget";

describe("budgetStatus", () => {
  it("is ok below 85%, warning from 85% up to the limit, over past it", () => {
    expect(budgetStatus(8499, 10000)).toBe("ok");
    expect(budgetStatus(8500, 10000)).toBe("warning");
    expect(budgetStatus(10000, 10000)).toBe("warning");
    expect(budgetStatus(10001, 10000)).toBe("over");
  });
});

describe("budgetProgress", () => {
  const rows = budgetProgress(
    { Dining: 20000, Groceries: 50000, Travel: 30000, Unused: 0 },
    [
      { category: "Dining", cents: 25000 },
      { category: "Groceries", cents: 10000 },
      { category: "Shopping", cents: 99999 },
    ],
  );

  it("reports only budgeted categories, most urgent first", () => {
    expect(rows.map((r) => r.category)).toEqual(["Dining", "Groceries", "Travel"]);
  });

  it("computes remaining (negative when over) and an unclamped ratio", () => {
    expect(rows[0]).toMatchObject({ spentCents: 25000, remainingCents: -5000, ratio: 1.25, status: "over" });
    expect(rows[2]).toMatchObject({ spentCents: 0, remainingCents: 30000, ratio: 0, status: "ok" });
  });

  it("totals only budgeted categories", () => {
    expect(budgetTotals(rows)).toEqual({ limitCents: 100000, spentCents: 35000 });
  });
});

describe("budgetPace", () => {
  it("compares spending with an even spread across the month", () => {
    expect(budgetPace(5000, 30000, 10, 30)).toEqual({ expectedCents: 10000, aheadCents: -5000, monthFraction: 1 / 3 });
    expect(budgetPace(20000, 30000, 10, 30).aheadCents).toBe(10000);
  });

  it("rounds expected spend to whole cents and clamps the day", () => {
    expect(budgetPace(0, 10000, 1, 31).expectedCents).toBe(323);
    expect(budgetPace(0, 10000, 40, 31).monthFraction).toBe(1);
  });

  it("knows month lengths including leap years", () => {
    expect([daysInMonth("2026-02"), daysInMonth("2024-02"), daysInMonth("2026-10")]).toEqual([28, 29, 31]);
  });
});
