import { formatCents } from "../lib/money";

interface Row {
  name: string;
  cents: number;
  color: string;
}

/** Shared tooltip: value first (it is what the reader is after), series name second. */
export function ChartTooltip({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="chart-tip">
      <div className="chart-tip__title">{title}</div>
      {rows.map((r) => (
        <div className="chart-tip__row" key={r.name}>
          <span className="chart-tip__key" style={{ background: r.color }} aria-hidden />
          <strong>{formatCents(r.cents)}</strong>
          <span>{r.name}</span>
        </div>
      ))}
    </div>
  );
}
