/** Shared domain types. Money is always integer cents (see money.ts). */

export type CategorySource = "rule" | "manual" | "import";

export interface Transaction {
  id: string;
  /** ISO calendar date, YYYY-MM-DD. Kept as a string to avoid timezone drift. */
  date: string;
  description: string;
  /** Signed integer cents: negative = money out, positive = money in. */
  amountCents: number;
  category: string;
  /** Where the category came from; manual choices survive rule changes. */
  categorySource: CategorySource;
}

export interface Rule {
  id: string;
  /** Case-insensitive substring matched against the description. */
  keyword: string;
  category: string;
}

/** Monthly spending limit per category, in cents. */
export type Budgets = Record<string, number>;

export const UNCATEGORIZED = "Uncategorized";
export const INCOME = "Income";

export const DEFAULT_CATEGORIES = [
  "Housing",
  "Groceries",
  "Dining",
  "Transport",
  "Utilities",
  "Entertainment",
  "Shopping",
  "Health",
  INCOME,
  UNCATEGORIZED,
] as const;
