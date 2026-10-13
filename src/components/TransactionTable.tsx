import { formatDay } from "../lib/format";
import { formatCents } from "../lib/money";
import type { Transaction } from "../lib/types";

interface Props {
  transactions: Transaction[];
  categories: string[];
  onSetCategory: (id: string, category: string) => void;
}

const SOURCE_LABEL = { rule: "Set by a rule", manual: "Set by you", import: "From the file" } as const;

/** Rendering is capped so a 10k-row import stays responsive; search narrows the rest. */
const MAX_ROWS = 300;

export function TransactionTable({ transactions, categories, onSetCategory }: Props) {
  const shown = transactions.slice(0, MAX_ROWS);
  return (
    <div className="table-wrap tx-wrap">
      <table className="data-table tx-table">
        <caption className="sr-only">Transactions</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Description</th>
            <th scope="col">Category</th>
            <th scope="col" className="num">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map((t) => (
            <tr key={t.id}>
              <td className="tx-date">{formatDay(t.date)}</td>
              <td className="tx-desc">{t.description}</td>
              <td>
                <label className="sr-only" htmlFor={`cat-${t.id}`}>
                  Category for {t.description} on {formatDay(t.date)}
                </label>
                <select
                  id={`cat-${t.id}`}
                  className={`cat-select cat-select--${t.categorySource}`}
                  value={t.category}
                  title={SOURCE_LABEL[t.categorySource]}
                  onChange={(e) => onSetCategory(t.id, e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </td>
              <td className={`num tx-amount${t.amountCents > 0 ? " is-in" : ""}`}>
                {t.amountCents > 0 ? "+" : ""}
                {formatCents(t.amountCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {transactions.length === 0 && <p className="empty">No transactions match. Clear the search or pick another month.</p>}
      {transactions.length > MAX_ROWS && (
        <p className="table-note">
          Showing the newest {MAX_ROWS} of {transactions.length}. Narrow with search or filters to see the rest.
        </p>
      )}
    </div>
  );
}
