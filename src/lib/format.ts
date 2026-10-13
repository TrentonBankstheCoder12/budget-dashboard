/** Display helpers that are not about money. */

const monthFmt = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const shortMonthFmt = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// Dates are parsed as UTC and formatted in UTC so "2026-03-01" never shows as Feb 28.
const utc = (iso: string) => new Date(`${iso.length === 7 ? `${iso}-01` : iso}T00:00:00Z`);

export const formatMonth = (month: string) => monthFmt.format(utc(month));
export const formatShortMonth = (month: string) => shortMonthFmt.format(utc(month));
export const formatDay = (date: string) => dayFmt.format(utc(date));

export const formatPercent = (fraction: number) =>
  new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 }).format(fraction);
