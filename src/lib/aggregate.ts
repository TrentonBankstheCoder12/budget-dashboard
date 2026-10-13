import { sumCents } from "./money";
import { INCOME, type Transaction } from "./types";

/** "2026-03-14" -> "2026-03". Months are compared as strings, which sort correctly. */
export const monthOf = (isoDate: string) => isoDate.slice(0, 7);

/** All months that have data, newest first. */
export function listMonths(transactions: readonly Transaction[]): string[] {
  return [...new Set(transactions.map((t) => monthOf(t.date)))].sort().reverse();
}

export interface Filters {
  /** "YYYY-MM" or "all". */
  month: string;
  /** Category name or "all". */
  category: string;
  search: string;
}

export function filterTransactions(transactions: readonly Transaction[], f: Filters): Transaction[] {
  const q = f.search.trim().toLowerCase();
  return transactions
    .filter(
      (t) =>
        (f.month === "all" || monthOf(t.date) === f.month) &&
        (f.category === "all" || t.category === f.category) &&
        (q === "" || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)),
    )
    .sort((a, b) => (a.date === b.date ? a.description.localeCompare(b.description) : b.date.localeCompare(a.date)));
}

/**
 * Is this transaction spending? Outflows count as spending, except that a
 * negative amount in the Income category (e.g. a reversed paycheck) is not.
 * Refunds (positive amounts in a spending category) reduce that category's spend.
 */
const isSpendingCategory = (category: string) => category !== INCOME;

/**
 * Net spending per category as positive cents, largest first.
 * A $20 refund at "Shopping" offsets $20 of shopping spend instead of being
 * miscounted as income, which is how most banks' own apps present it.
 */
export function spendingByCategory(transactions: readonly Transaction[]): { category: string; cents: number }[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (!isSpendingCategory(t.category)) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) - t.amountCents);
  }
  return [...totals]
    .map(([category, cents]) => ({ category, cents }))
    .filter((r) => r.cents > 0)
    .sort((a, b) => b.cents - a.cents || a.category.localeCompare(b.category));
}

export interface MonthSummary {
  month: string;
  incomeCents: number;
  expenseCents: number;
  /** income - expense. Positive means money was saved. */
  netCents: number;
}

/**
 * Income vs expense per month, oldest first (the natural order for a chart).
 * Invariant: incomeCents - expenseCents === netCents === sum of all amounts in that month.
 */
export function monthlySummary(transactions: readonly Transaction[]): MonthSummary[] {
  const byMonth = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const m = monthOf(t.date);
    byMonth.set(m, [...(byMonth.get(m) ?? []), t]);
  }
  return [...byMonth.keys()].sort().map((month) => {
    const txs = byMonth.get(month)!;
    const incomeCents = sumCents(txs.filter((t) => !isSpendingCategory(t.category)).map((t) => t.amountCents));
    const expenseCents = -sumCents(txs.filter((t) => isSpendingCategory(t.category)).map((t) => t.amountCents));
    return { month, incomeCents, expenseCents, netCents: incomeCents - expenseCents };
  });
}

/** Savings rate as a fraction (0.2 = 20%), or null when there is no income to divide by. */
export function savingsRate(summary: Pick<MonthSummary, "incomeCents" | "netCents">): number | null {
  return summary.incomeCents > 0 ? summary.netCents / summary.incomeCents : null;
}
