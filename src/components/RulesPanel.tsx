import { useState } from "react";
import type { Rule } from "../lib/types";

interface Props {
  rules: Rule[];
  categories: string[];
  onAdd: (keyword: string, category: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}

/**
 * Rules are checked top to bottom and the first match wins, so order is
 * editable. Changing a rule re-sorts every transaction it applies to,
 * except the ones you categorized by hand.
 */
export function RulesPanel({ rules, categories, onAdd, onRemove, onMove }: Props) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const k = keyword.trim();
    if (!k) return setError("Enter text to look for in the description.");
    if (rules.some((r) => r.keyword.toLowerCase() === k.toLowerCase())) {
      return setError(`A rule for "${k}" already exists.`);
    }
    onAdd(k, category);
    setKeyword("");
    setError(null);
  };

  return (
    <section className="panel rules" aria-labelledby="rules-heading">
      <div className="panel__head">
        <h2 id="rules-heading">Categorization rules</h2>
      </div>
      <p className="muted">The first rule whose text appears in a description decides its category.</p>
      <form
        className="rule-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label>
          <span>Description contains</span>
          <input
            value={keyword}
            placeholder="e.g. whole foods"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "rule-error" : undefined}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </label>
        <label>
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn">
          Add rule
        </button>
      </form>
      {error && (
        <p id="rule-error" className="field-error" role="alert">
          {error}
        </p>
      )}
      <ol className="rule-list">
        {rules.map((r, i) => (
          <li key={r.id}>
            <span className="rule-list__kw">{r.keyword}</span>
            <span className="rule-list__cat">{r.category}</span>
            <span className="rule-list__actions">
              <button type="button" className="icon-btn" disabled={i === 0} onClick={() => onMove(r.id, -1)} aria-label={`Move "${r.keyword}" rule up`}>
                ↑
              </button>
              <button
                type="button"
                className="icon-btn"
                disabled={i === rules.length - 1}
                onClick={() => onMove(r.id, 1)}
                aria-label={`Move "${r.keyword}" rule down`}
              >
                ↓
              </button>
              <button type="button" className="icon-btn" onClick={() => onRemove(r.id)} aria-label={`Delete "${r.keyword}" rule`}>
                ×
              </button>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
