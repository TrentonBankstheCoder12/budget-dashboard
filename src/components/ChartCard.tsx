import { useId, useState, type ReactNode } from "react";

interface Props {
  title: string;
  /** One sentence telling the reader what to look for. */
  caption?: string;
  chart: ReactNode;
  /** Same numbers as the chart, as an accessible table. */
  table: ReactNode;
  empty?: boolean;
}

/** Every chart can flip to a plain table so no value is reachable only by hovering. */
export function ChartCard({ title, caption, chart, table, empty }: Props) {
  const [asTable, setAsTable] = useState(false);
  const id = useId();
  return (
    <figure className="panel chart-card" aria-labelledby={`${id}-title`}>
      <div className="panel__head">
        <h2 id={`${id}-title`}>{title}</h2>
        {!empty && (
          <button type="button" className="btn btn--quiet btn--small" aria-pressed={asTable} onClick={() => setAsTable((v) => !v)}>
            {asTable ? "Show chart" : "Show table"}
          </button>
        )}
      </div>
      {caption && <figcaption className="chart-card__caption">{caption}</figcaption>}
      {empty ? <p className="empty">No spending in this view yet.</p> : asTable ? <div className="table-wrap">{table}</div> : chart}
    </figure>
  );
}
