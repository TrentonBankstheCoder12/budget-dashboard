import { useMemo, useState } from "react";
import { BudgetList } from "./components/BudgetList";
import { CategoryChart, IncomeExpenseChart, TrendChart } from "./components/Charts";
import { chartColors } from "./components/chartTheme";
import { ImportPanel } from "./components/ImportPanel";
import { PaceHero } from "./components/PaceHero";
import { RulesPanel } from "./components/RulesPanel";
import { TransactionTable } from "./components/TransactionTable";
import { useBudgetData } from "./hooks/useBudgetData";
import { useTheme } from "./hooks/useTheme";
import { filterTransactions, listMonths, monthlySummary, monthOf, spendingByCategory } from "./lib/aggregate";
import { budgetProgress, budgetTotals, daysInMonth } from "./lib/budget";
import { formatMonth } from "./lib/format";
import { formatCents } from "./lib/money";
import type { Budgets, Rule, Transaction } from "./lib/types";

interface Props {
  /** Injected in tests; the app otherwise loads from localStorage or sample data. */
  initialData?: { transactions: Transaction[]; rules: Rule[]; budgets: Budgets };
  /** Injected in tests so pacing does not depend on the real clock. */
  today?: Date;
}

const toMonth = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export default function App({ initialData, today = new Date() }: Props) {
  const data = useBudgetData(initialData);
  const { theme, toggle } = useTheme();
  const colors = chartColors[theme];

  const currentMonth = toMonth(today);
  const months = useMemo(() => {
    const list = listMonths(data.transactions);
    return list.length ? list : [currentMonth];
  }, [data.transactions, currentMonth]);

  const [pickedMonth, setPickedMonth] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  // If the picked month disappears (e.g. data cleared), fall back to the newest one.
  const month = pickedMonth && months.includes(pickedMonth) ? pickedMonth : months[0];

  const monthTxs = useMemo(() => data.transactions.filter((t) => monthOf(t.date) === month), [data.transactions, month]);
  const spending = useMemo(() => spendingByCategory(monthTxs), [monthTxs]);
  const budgets = useMemo(() => budgetProgress(data.budgets, spending), [data.budgets, spending]);
  const summary = useMemo(() => monthlySummary(data.transactions), [data.transactions]);
  const visible = useMemo(
    () => filterTransactions(data.transactions, { month, category, search }),
    [data.transactions, month, category, search],
  );
  // The trend line follows the category filter, so "Dining" shows dining over time.
  const trend = useMemo(
    () => (category === "all" ? summary : monthlySummary(data.transactions.filter((t) => t.category === category))),
    [summary, data.transactions, category],
  );

  const isCurrentMonth = month === currentMonth;
  const dayOfMonth = isCurrentMonth ? today.getDate() : daysInMonth(month);
  const unbudgeted = data.categories.filter((c) => c !== "Income" && !(c in data.budgets));
  const trendBudget = category === "all" ? budgetTotals(budgets).limitCents : (data.budgets[category] ?? 0);
  const monthIndex = months.indexOf(month);

  const visibleNet = visible.reduce((sum, t) => sum + t.amountCents, 0);

  return (
    <div className="app">
      <a href="#transactions" className="skip-link">
        Skip to transactions
      </a>
      <header className="topbar">
        <div className="brand">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <rect x="2" y="13" width="4" height="9" rx="1" fill="currentColor" opacity=".45" />
            <rect x="10" y="8" width="4" height="14" rx="1" fill="currentColor" opacity=".7" />
            <rect x="18" y="3" width="4" height="19" rx="1" fill="currentColor" />
          </svg>
          <span>Runway</span>
        </div>
        <div className="topbar__actions">
          {data.saveFailed && (
            <span className="save-warning" role="status">
              Changes aren't being saved in this browser
            </span>
          )}
          <button type="button" className="btn btn--quiet btn--small" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </header>

      <div className="filters" role="search" aria-label="Filter transactions">
        <div className="month-step">
          <button
            type="button"
            className="icon-btn"
            aria-label="Previous month"
            disabled={monthIndex >= months.length - 1}
            onClick={() => setPickedMonth(months[monthIndex + 1])}
          >
            ‹
          </button>
          <label className="sr-only" htmlFor="month">
            Month
          </label>
          <select id="month" value={month} onChange={(e) => setPickedMonth(e.target.value)}>
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="icon-btn"
            aria-label="Next month"
            disabled={monthIndex <= 0}
            onClick={() => setPickedMonth(months[monthIndex - 1])}
          >
            ›
          </button>
        </div>
        <label className="sr-only" htmlFor="category">
          Category
        </label>
        <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {data.categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="search">
          Search descriptions
        </label>
        <input
          id="search"
          type="search"
          placeholder="Search descriptions"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <main>
        {data.transactions.length === 0 ? (
          <section className="hero hero--empty">
            <h1 className="hero__line">Start with your own transactions or a sample account.</h1>
            <p className="hero__note">Import a CSV from your bank below, or load six months of sample data to explore.</p>
            <button type="button" className="btn" onClick={data.loadSample}>
              Load sample data
            </button>
          </section>
        ) : (
          <PaceHero month={month} rows={budgets} dayOfMonth={dayOfMonth} isCurrentMonth={isCurrentMonth} />
        )}

        <div className="grid">
          <div className="grid__main">
            <CategoryChart data={spending} colors={colors} periodLabel={formatMonth(month)} highlight={category} />
            <TrendChart data={trend} colors={colors} budgetCents={trendBudget} categoryLabel={category === "all" ? null : category} />
            <IncomeExpenseChart data={summary} colors={colors} />
          </div>
          <aside className="grid__side">
            <BudgetList rows={budgets} unbudgeted={unbudgeted} onSetBudget={data.setBudget} />
          </aside>
        </div>

        <section className="panel" id="transactions" aria-labelledby="tx-heading" tabIndex={-1}>
          <div className="panel__head">
            <h2 id="tx-heading">Transactions</h2>
            <span className="muted tx-count">
              {visible.length} in {formatMonth(month)}, net {formatCents(visibleNet)}
            </span>
          </div>
          <TransactionTable transactions={visible} categories={data.categories} onSetCategory={data.setCategory} />
        </section>

        <div className="grid grid--even">
          <ImportPanel rules={data.rules} onImport={data.importTransactions} />
          <RulesPanel
            rules={data.rules}
            categories={data.categories}
            onAdd={data.addRule}
            onRemove={data.removeRule}
            onMove={data.moveRule}
          />
        </div>
      </main>

      <footer className="footer">
        <p>Everything stays in this browser. Nothing is uploaded.</p>
        <div className="footer__actions">
          <button type="button" className="btn btn--quiet btn--small" onClick={data.loadSample}>
            Reset to sample data
          </button>
          <button
            type="button"
            className="btn btn--quiet btn--small btn--danger"
            onClick={() => {
              if (window.confirm("Delete all transactions and budgets from this browser?")) data.clearAll();
            }}
          >
            Delete all data
          </button>
        </div>
      </footer>
    </div>
  );
}
