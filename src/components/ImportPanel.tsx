import { useRef, useState } from "react";
import { parseTransactionsCsv, type ImportResult } from "../lib/csv";
import type { Rule, Transaction } from "../lib/types";

interface Props {
  rules: Rule[];
  onImport: (txs: Transaction[]) => { added: number; skipped: number };
}

const EXAMPLE = `date,description,amount
2026-10-01,Payroll - Northwind Labs,2600.00
2026-10-02,Trader Joe's,-54.20
10/03/2026,"Corner Cafe, Main St",-6.75`;

const MAX_ERRORS_SHOWN = 8;

/**
 * CSV import with a preview step: the file is parsed and validated first,
 * and nothing is added until the user confirms. Bad rows are listed by line.
 */
export function ImportPanel({ rules, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const handleText = (name: string, text: string) => {
    setFileName(name);
    setDone(null);
    setResult(parseTransactionsCsv(text, rules));
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFileName(file.name);
      setResult({ transactions: [], errors: [], fatal: "The file is larger than 5 MB. Split it into smaller exports." });
      return;
    }
    handleText(file.name, await file.text());
  };

  const confirm = () => {
    if (!result) return;
    const { added, skipped } = onImport(result.transactions);
    setDone(
      `Imported ${added} transaction${added === 1 ? "" : "s"}` +
        (skipped ? `. Skipped ${skipped} already in your list.` : "."),
    );
    setResult(null);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const good = result?.transactions.length ?? 0;
  const bad = result?.errors.length ?? 0;

  return (
    <section className="panel import" aria-labelledby="import-heading">
      <div className="panel__head">
        <h2 id="import-heading">Import transactions</h2>
      </div>
      <p className="muted">
        Upload a CSV with <code>date</code>, <code>description</code> and <code>amount</code> columns. Spending is
        negative. An optional <code>category</code> column overrides your rules.
      </p>

      <div className="import__actions">
        <label className="btn file-btn">
          Choose CSV file
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
        </label>
        <button type="button" className="btn btn--quiet" onClick={() => handleText("example.csv", EXAMPLE)}>
          Try the example file
        </button>
      </div>

      {done && (
        <p className="notice notice--ok" role="status">
          {done}
        </p>
      )}

      {result && (
        <div className="import__result" role="status" aria-live="polite">
          {result.fatal ? (
            <p className="notice notice--error">
              <strong>{fileName} can't be imported.</strong> {result.fatal}
            </p>
          ) : (
            <>
              <p className={`notice ${bad ? "notice--warn" : "notice--ok"}`}>
                <strong>{fileName}:</strong> {good} row{good === 1 ? "" : "s"} ready
                {bad > 0 && `, ${bad} row${bad === 1 ? "" : "s"} with problems will be skipped`}.
              </p>
              {bad > 0 && (
                <ul className="row-errors">
                  {result.errors.slice(0, MAX_ERRORS_SHOWN).map((e) => (
                    <li key={e.line}>
                      <span className="row-errors__line">Line {e.line}</span> {e.message}
                    </li>
                  ))}
                  {bad > MAX_ERRORS_SHOWN && <li>…and {bad - MAX_ERRORS_SHOWN} more.</li>}
                </ul>
              )}
              <div className="import__actions">
                <button type="button" className="btn" disabled={good === 0} onClick={confirm}>
                  Import {good} row{good === 1 ? "" : "s"}
                </button>
                <button type="button" className="btn btn--quiet" onClick={() => setResult(null)}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
