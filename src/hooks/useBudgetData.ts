import { useCallback, useEffect, useMemo, useState } from "react";
import { applyRules, DEFAULT_RULES } from "../lib/categorize";
import { mergeTransactions } from "../lib/csv";
import { newId } from "../lib/id";
import { generateSampleTransactions, SAMPLE_BUDGETS } from "../lib/sample";
import { clearState, loadState, saveState } from "../lib/storage";
import { DEFAULT_CATEGORIES, type Budgets, type Rule, type Transaction } from "../lib/types";

interface Data {
  transactions: Transaction[];
  rules: Rule[];
  budgets: Budgets;
}

function sampleData(): Data {
  return { transactions: generateSampleTransactions(new Date()), rules: DEFAULT_RULES, budgets: SAMPLE_BUDGETS };
}

/**
 * All app data lives here. Components get plain values and intent-named
 * actions; the money logic itself stays in src/lib so it can be unit tested
 * without React. Every change is written back to localStorage.
 */
export function useBudgetData(initial?: Data) {
  // Lazy initializer: read storage once, fall back to sample data on first visit.
  const [data, setData] = useState<Data>(() => initial ?? loadState() ?? sampleData());
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    setSaveFailed(!saveState(data));
  }, [data]);

  const categories = useMemo(() => {
    const all = new Set<string>(DEFAULT_CATEGORIES);
    for (const t of data.transactions) all.add(t.category);
    for (const r of data.rules) all.add(r.category);
    for (const c of Object.keys(data.budgets)) all.add(c);
    return [...all].sort((a, b) => a.localeCompare(b));
  }, [data]);

  /** Any rule change re-categorizes rule-assigned transactions so the charts stay consistent. */
  const updateRules = useCallback((next: (rules: Rule[]) => Rule[]) => {
    setData((d) => {
      const rules = next(d.rules);
      return { ...d, rules, transactions: applyRules(d.transactions, rules) };
    });
  }, []);

  return {
    ...data,
    categories,
    saveFailed,
    importTransactions(incoming: Transaction[]): { added: number; skipped: number } {
      // Computed from the current render's data so the count can be shown right away.
      const { merged, skipped } = mergeTransactions(data.transactions, incoming);
      setData((d) => ({ ...d, transactions: mergeTransactions(d.transactions, incoming).merged }));
      return { added: merged.length - data.transactions.length, skipped };
    },
    setCategory(id: string, category: string) {
      setData((d) => ({
        ...d,
        transactions: d.transactions.map((t) => (t.id === id ? { ...t, category, categorySource: "manual" } : t)),
      }));
    },
    setBudget(category: string, cents: number) {
      setData((d) => {
        const budgets = { ...d.budgets };
        if (cents > 0) budgets[category] = cents;
        else delete budgets[category];
        return { ...d, budgets };
      });
    },
    addRule(keyword: string, category: string) {
      // New rules go first: a specific rule the user just wrote should beat older, broader ones.
      updateRules((rules) => [{ id: newId("rule"), keyword: keyword.trim(), category }, ...rules]);
    },
    removeRule(id: string) {
      updateRules((rules) => rules.filter((r) => r.id !== id));
    },
    moveRule(id: string, direction: -1 | 1) {
      updateRules((rules) => {
        const i = rules.findIndex((r) => r.id === id);
        const j = i + direction;
        if (i < 0 || j < 0 || j >= rules.length) return rules;
        const next = [...rules];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      });
    },
    loadSample() {
      setData(sampleData());
    },
    clearAll() {
      clearState();
      setData({ transactions: [], rules: DEFAULT_RULES, budgets: {} });
    },
  };
}

export type BudgetData = ReturnType<typeof useBudgetData>;
