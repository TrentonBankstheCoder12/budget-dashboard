import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthSummary } from "../lib/aggregate";
import { formatMonth, formatShortMonth } from "../lib/format";
import { formatCents } from "../lib/money";
import { ChartCard } from "./ChartCard";
import type { ChartColors } from "./chartTheme";
import { ChartTooltip } from "./ChartTooltip";

const axisTick = (c: ChartColors) => ({ fill: c.axis, fontSize: 12 });
const compact = (cents: number) => formatCents(cents, { compact: true });

/** Spending per category: one series, so one color; length carries the value. */
export function CategoryChart({
  data,
  colors,
  periodLabel,
  highlight,
}: {
  data: { category: string; cents: number }[];
  colors: ChartColors;
  periodLabel: string;
  /** Category picked in the filter bar, or "all". Other bars recede so it stands out. */
  highlight: string;
}) {
  const height = Math.max(160, data.length * 34 + 24);
  return (
    <ChartCard
      title="Where the money went"
      caption={`Net spending by category, ${periodLabel}. Refunds count against their category.`}
      empty={data.length === 0}
      chart={
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 72, bottom: 0, left: 0 }} barCategoryGap={6}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="category" width={104} tickLine={false} axisLine={false} tick={axisTick(colors)} />
            <Tooltip
              cursor={{ fill: colors.grid, opacity: 0.5 }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <ChartTooltip
                    title={String(payload[0].payload.category)}
                    rows={[{ name: "Spent", cents: Number(payload[0].value), color: colors.single }]}
                  />
                ) : null
              }
            />
            <Bar dataKey="cents" name="Spent" fill={colors.single} radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.category} fill={highlight === "all" || highlight === d.category ? colors.single : colors.muted} />
              ))}
              <LabelList dataKey="cents" position="right" formatter={(v) => formatCents(Number(v))} className="bar-label" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      }
      table={
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col" className="num">
                Spent
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.category}>
                <td>{d.category}</td>
                <td className="num">{formatCents(d.cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    />
  );
}

/** Total spending month by month, with the monthly budget as a reference line. */
export function TrendChart({
  data,
  colors,
  budgetCents,
  categoryLabel,
}: {
  data: MonthSummary[];
  colors: ChartColors;
  budgetCents: number;
  /** Set when the trend is filtered to one category. */
  categoryLabel: string | null;
}) {
  const what = categoryLabel ? `${categoryLabel} spending` : "Total spending";
  return (
    <ChartCard
      title={categoryLabel ? `${categoryLabel} over time` : "Spending trend"}
      caption={budgetCents > 0 ? `${what} each month against the ${formatCents(budgetCents)} monthly budget.` : `${what} each month.`}
      empty={data.length === 0}
      chart={
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis dataKey="month" tickFormatter={formatShortMonth} tickLine={false} axisLine={false} tick={axisTick(colors)} />
            <YAxis tickFormatter={compact} tickLine={false} axisLine={false} tick={axisTick(colors)} width={56} />
            {budgetCents > 0 && (
              <ReferenceLine
                y={budgetCents}
                stroke={colors.axis}
                strokeDasharray="4 4"
                label={{ value: "Budget", position: "insideTopRight", fill: colors.axis, fontSize: 12 }}
              />
            )}
            <Tooltip
              cursor={{ stroke: colors.axis, strokeWidth: 1 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <ChartTooltip
                    title={formatMonth(String(label))}
                    rows={[{ name: "Spent", cents: Number(payload[0].value), color: colors.single }]}
                  />
                ) : null
              }
            />
            <Line
              type="monotone"
              dataKey="expenseCents"
              name="Spent"
              stroke={colors.single}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, fill: "var(--surface)" }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      }
      table={<SummaryTable data={data} />}
    />
  );
}

/** Income vs expense side by side per month. Two series: legend plus tooltip, never color alone. */
export function IncomeExpenseChart({ data, colors }: { data: MonthSummary[]; colors: ChartColors }) {
  return (
    <ChartCard
      title="Income and spending"
      caption="The gap between the bars is what you kept each month."
      empty={data.length === 0}
      chart={
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis dataKey="month" tickFormatter={formatShortMonth} tickLine={false} axisLine={false} tick={axisTick(colors)} />
            <YAxis tickFormatter={compact} tickLine={false} axisLine={false} tick={axisTick(colors)} width={56} />
            <Legend
              verticalAlign="top"
              align="left"
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 13, paddingBottom: 8, color: colors.axis }}
            />
            <Tooltip
              cursor={{ fill: colors.grid, opacity: 0.5 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <ChartTooltip
                    title={formatMonth(String(label))}
                    rows={payload.map((p) => ({ name: String(p.name), cents: Number(p.value), color: String(p.color) }))}
                  />
                ) : null
              }
            />
            <Bar dataKey="incomeCents" name="Income" fill={colors.income} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="expenseCents" name="Spending" fill={colors.expense} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      }
      table={<SummaryTable data={data} />}
    />
  );
}

function SummaryTable({ data }: { data: MonthSummary[] }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th scope="col">Month</th>
          <th scope="col" className="num">
            Income
          </th>
          <th scope="col" className="num">
            Spending
          </th>
          <th scope="col" className="num">
            Kept
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((m) => (
          <tr key={m.month}>
            <td>{formatMonth(m.month)}</td>
            <td className="num">{formatCents(m.incomeCents)}</td>
            <td className="num">{formatCents(m.expenseCents)}</td>
            <td className="num">{formatCents(m.netCents)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
