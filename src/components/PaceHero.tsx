import { budgetPace, budgetTotals, daysInMonth, type BudgetProgress } from "../lib/budget";
import { formatMonth } from "../lib/format";
import { formatCents } from "../lib/money";

interface Props {
  month: string;
  rows: BudgetProgress[];
  /** Day of month "today" for pacing; equals the month length for past months. */
  dayOfMonth: number;
  isCurrentMonth: boolean;
}

/**
 * The one question this dashboard exists to answer: how much is left this
 * month, and is spending ahead of the calendar? The track shows budget used
 * (filled) against how far through the month we are (the marker).
 */
export function PaceHero({ month, rows, dayOfMonth, isCurrentMonth }: Props) {
  const { limitCents, spentCents } = budgetTotals(rows);
  const total = daysInMonth(month);
  const pace = budgetPace(spentCents, limitCents, dayOfMonth, total);
  const left = limitCents - spentCents;
  const usedFraction = limitCents > 0 ? spentCents / limitCents : 0;

  if (limitCents === 0) {
    return (
      <section className="hero" aria-labelledby="hero-heading">
        <h1 id="hero-heading" className="hero__line">
          Set a budget to see what is left for {formatMonth(month)}.
        </h1>
        <p className="hero__note">Add monthly limits in the Budgets list below.</p>
      </section>
    );
  }

  const verb = isCurrentMonth ? "left to spend in" : left >= 0 ? "unspent in" : "over budget in";
  let note: string;
  if (left < 0) {
    note = `Spending passed the ${formatCents(limitCents)} budget by ${formatCents(-left)}.`;
  } else if (!isCurrentMonth) {
    note = `Spent ${formatCents(spentCents)} of ${formatCents(limitCents)}.`;
  } else if (pace.aheadCents > 0) {
    note = `${formatCents(pace.aheadCents)} ahead of an even pace for day ${dayOfMonth} of ${total}.`;
  } else {
    note = `${formatCents(-pace.aheadCents)} under an even pace for day ${dayOfMonth} of ${total}.`;
  }

  return (
    <section className="hero" aria-labelledby="hero-heading">
      <h1 id="hero-heading" className="hero__line">
        <span className={`hero__figure${left < 0 ? " is-over" : ""}`}>{formatCents(Math.abs(left))}</span>
        <span className="hero__rest">
          {left < 0 && isCurrentMonth ? "over budget in" : verb} {formatMonth(month)}
        </span>
      </h1>
      <div
        className="pace"
        role="meter"
        aria-label="Share of total budget used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(usedFraction, 1) * 100)}
        aria-valuetext={`${formatCents(spentCents)} of ${formatCents(limitCents)} used`}
      >
        <div className={`pace__fill${left < 0 ? " is-over" : ""}`} style={{ width: `${Math.min(usedFraction, 1) * 100}%` }} />
        {isCurrentMonth && (
          <div className="pace__today" style={{ left: `${pace.monthFraction * 100}%` }}>
            <span>Day {dayOfMonth}</span>
          </div>
        )}
      </div>
      <p className="hero__note">{note}</p>
    </section>
  );
}
