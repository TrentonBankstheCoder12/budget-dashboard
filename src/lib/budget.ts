import type { Budgets } from "./types";

export type BudgetStatus = "ok" | "warning" | "over";

export interface BudgetProgress {
  category: string;
  limitCents: number;
  spentCents: number;
  /** limit - spent; negative when over budget. */
  remainingCents: number;
  /** spent / limit, NOT clamped, so 1.25 means 25% over. The UI clamps for bar width. */
  ratio: number;
  status: BudgetStatus;
}

/** Spending at or above this percent of the limit triggers a heads-up before you go over. */
export const WARNING_PERCENT = 85;

export function budgetStatus(spentCents: number, limitCents: number): BudgetStatus {
  if (spentCents > limitCents) return "over";
  // Integer comparison (spent*100 >= limit*85) avoids float rounding at the boundary.
  if (spentCents * 100 >= limitCents * WARNING_PERCENT) return "warning";
  return "ok";
}

/**
 * Compare budgets against actual spending for one period.
 * Only categories with a positive limit are reported; over-budget first, then by ratio,
 * so the most urgent rows sit at the top of the list.
 */
export function budgetProgress(
  budgets: Budgets,
  spending: readonly { category: string; cents: number }[],
): BudgetProgress[] {
  const spentBy = new Map(spending.map((s) => [s.category, s.cents]));
  return Object.entries(budgets)
    .filter(([, limit]) => limit > 0)
    .map(([category, limitCents]) => {
      const spentCents = spentBy.get(category) ?? 0;
      return {
        category,
        limitCents,
        spentCents,
        remainingCents: limitCents - spentCents,
        ratio: spentCents / limitCents,
        status: budgetStatus(spentCents, limitCents),
      };
    })
    .sort((a, b) => b.ratio - a.ratio || a.category.localeCompare(b.category));
}

/** Total budget vs total spent across budgeted categories only. */
export function budgetTotals(rows: readonly BudgetProgress[]): { limitCents: number; spentCents: number } {
  return rows.reduce(
    (acc, r) => ({ limitCents: acc.limitCents + r.limitCents, spentCents: acc.spentCents + r.spentCents }),
    { limitCents: 0, spentCents: 0 },
  );
}

export interface Pace {
  /** What you would have spent by today if spending were spread evenly over the month. */
  expectedCents: number;
  /** spent - expected. Positive means spending is running ahead of the month. */
  aheadCents: number;
  /** Fraction of the month elapsed, 0..1. */
  monthFraction: number;
}

/**
 * Linear pacing: by day 10 of a 30-day month you "should" have used a third of
 * the budget. It is a rough guide (rent lands on day 1), but it answers the
 * question people actually ask mid-month: "am I on track?"
 * Rounds expected spend to whole cents so all results stay integers.
 */
export function budgetPace(spentCents: number, limitCents: number, dayOfMonth: number, daysInMonth: number): Pace {
  const day = Math.min(Math.max(dayOfMonth, 0), daysInMonth);
  const expectedCents = Math.round((limitCents * day) / daysInMonth);
  return { expectedCents, aheadCents: spentCents - expectedCents, monthFraction: day / daysInMonth };
}

/** Days in a "YYYY-MM" month. Uses UTC so the user's timezone cannot shift the answer. */
export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
