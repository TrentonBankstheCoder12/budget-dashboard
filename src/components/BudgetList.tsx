import { useState } from "react";
import type { BudgetProgress } from "../lib/budget";
import { formatCents, parseAmountToCents } from "../lib/money";

interface Props {
  rows: BudgetProgress[];
  /** Categories that have no budget yet, offered in the "add" control. */
  unbudgeted: string[];
  onSetBudget: (category: string, cents: number) => void;
}

const STATUS_LABEL = { ok: "On track", warning: "Close to limit", over: "Over budget" } as const;

export function BudgetList({ rows, unbudgeted, onSetBudget }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");

  const startEdit = (category: string, limitCents: number) => {
    setEditing(category);
    setDraft((limitCents / 100).toFixed(2));
    setError(null);
  };

  const commit = (category: string) => {
    const parsed = parseAmountToCents(draft);
    if (!parsed.ok || parsed.cents < 0) {
      setError(parsed.ok ? "Budget cannot be negative" : parsed.error);
      return;
    }
    onSetBudget(category, parsed.cents);
    setEditing(null);
  };

  return (
    <section className="panel budgets" aria-labelledby="budgets-heading">
      <div className="panel__head">
        <h2 id="budgets-heading">Budgets</h2>
        {unbudgeted.length > 0 && (
          <form
            className="inline-add"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newCategory) return;
              onSetBudget(newCategory, 10_000);
              startEdit(newCategory, 10_000);
              setNewCategory("");
            }}
          >
            <label className="sr-only" htmlFor="new-budget">
              Category to budget
            </label>
            <select id="new-budget" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
              <option value="">Add a category…</option>
              {unbudgeted.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button type="submit" className="btn btn--quiet" disabled={!newCategory}>
              Add
            </button>
          </form>
        )}
      </div>

      {rows.length === 0 && <p className="empty">No budgets yet. Pick a category above to set a monthly limit.</p>}

      <ul className="budget-list">
        {rows.map((r) => (
          <li key={r.category} className={`budget budget--${r.status}`}>
            <div className="budget__top">
              <span className="budget__name">{r.category}</span>
              {editing === r.category ? (
                <form
                  className="budget__edit"
                  onSubmit={(e) => {
                    e.preventDefault();
                    commit(r.category);
                  }}
                >
                  <label className="sr-only" htmlFor={`limit-${r.category}`}>
                    Monthly limit for {r.category}
                  </label>
                  <input
                    id={`limit-${r.category}`}
                    inputMode="decimal"
                    value={draft}
                    autoFocus
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `limit-err-${r.category}` : undefined}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                  />
                  <button type="submit" className="btn btn--small">
                    Save
                  </button>
                  <button type="button" className="btn btn--small btn--quiet" onClick={() => onSetBudget(r.category, 0)}>
                    Remove
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="budget__amounts"
                  onClick={() => startEdit(r.category, r.limitCents)}
                  aria-label={`Edit ${r.category} budget, ${formatCents(r.spentCents)} spent of ${formatCents(r.limitCents)}`}
                >
                  <strong>{formatCents(r.spentCents)}</strong> of {formatCents(r.limitCents)}
                </button>
              )}
            </div>
            {editing === r.category && error && (
              <p className="field-error" id={`limit-err-${r.category}`} role="alert">
                {error}
              </p>
            )}
            <div className="bar" aria-hidden>
              <div className="bar__fill" style={{ width: `${Math.min(r.ratio, 1) * 100}%` }} />
            </div>
            <div className="budget__meta">
              {r.status !== "ok" && (
                <span className="status">
                  <StatusIcon status={r.status} />
                  {STATUS_LABEL[r.status]}
                </span>
              )}
              <span className="budget__remaining">
                {r.remainingCents >= 0 ? `${formatCents(r.remainingCents)} left` : `${formatCents(-r.remainingCents)} over`}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Status always carries an icon and a word, so it never depends on color alone. */
function StatusIcon({ status }: { status: "warning" | "over" }) {
  return status === "over" ? (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <path d="M8 4v5M8 11.2v.6" stroke="var(--surface)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
      <path d="M8 1.5 15 14H1z" fill="currentColor" />
      <path d="M8 6v4M8 11.8v.4" stroke="var(--surface)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
