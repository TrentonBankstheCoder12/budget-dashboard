import { INCOME, UNCATEGORIZED, type Rule, type Transaction } from "./types";

/**
 * Rule-based categorization: the first rule whose keyword appears in the
 * description wins. Order matters, so "UBER EATS" -> Dining must be listed
 * before "UBER" -> Transport. This is deliberately simple and explainable:
 * a user can always see *why* a transaction landed in a category.
 */
export function categorize(description: string, amountCents: number, rules: readonly Rule[]): string {
  const haystack = description.toLowerCase();
  for (const rule of rules) {
    const needle = rule.keyword.trim().toLowerCase();
    if (needle && haystack.includes(needle)) return rule.category;
  }
  // Unmatched money in is almost always income (paycheck, refund, transfer).
  return amountCents > 0 ? INCOME : UNCATEGORIZED;
}

/**
 * Re-run rules over every transaction. Only rule-assigned categories change:
 * a category the user picked by hand, or one that came in the CSV file, is an
 * explicit decision, and editing a rule must not silently undo it.
 */
export function applyRules(transactions: readonly Transaction[], rules: readonly Rule[]): Transaction[] {
  return transactions.map((tx) => {
    if (tx.categorySource !== "rule") return tx;
    const category = categorize(tx.description, tx.amountCents, rules);
    // Return the same object when nothing changed so React can skip re-rendering that row.
    return category === tx.category ? tx : { ...tx, category };
  });
}

export const DEFAULT_RULES: Rule[] = [
  { id: "r-payroll", keyword: "payroll", category: INCOME },
  { id: "r-rent", keyword: "rent", category: "Housing" },
  { id: "r-ubereats", keyword: "uber eats", category: "Dining" },
  { id: "r-doordash", keyword: "doordash", category: "Dining" },
  { id: "r-cafe", keyword: "cafe", category: "Dining" },
  { id: "r-chipotle", keyword: "chipotle", category: "Dining" },
  { id: "r-uber", keyword: "uber", category: "Transport" },
  { id: "r-metro", keyword: "metro", category: "Transport" },
  { id: "r-shell", keyword: "shell", category: "Transport" },
  { id: "r-tj", keyword: "trader joe", category: "Groceries" },
  { id: "r-wegmans", keyword: "wegmans", category: "Groceries" },
  { id: "r-electric", keyword: "electric", category: "Utilities" },
  { id: "r-internet", keyword: "internet", category: "Utilities" },
  { id: "r-phone", keyword: "mobile", category: "Utilities" },
  { id: "r-spotify", keyword: "spotify", category: "Entertainment" },
  { id: "r-netflix", keyword: "netflix", category: "Entertainment" },
  { id: "r-cinema", keyword: "cinema", category: "Entertainment" },
  { id: "r-amazon", keyword: "amazon", category: "Shopping" },
  { id: "r-target", keyword: "target", category: "Shopping" },
  { id: "r-pharmacy", keyword: "pharmacy", category: "Health" },
  { id: "r-gym", keyword: "gym", category: "Health" },
];
