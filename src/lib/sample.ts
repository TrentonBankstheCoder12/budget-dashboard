import { categorize, DEFAULT_RULES } from "./categorize";
import type { Budgets, Transaction } from "./types";

/**
 * Deterministic sample data so the dashboard is useful on first load and
 * screenshots/tests are reproducible. All merchants and amounts are invented.
 */

/** Mulberry32: a tiny seeded PRNG. Same seed -> same sequence, every time. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Recurring {
  day: number;
  description: string;
  cents: number;
}

const MONTHLY: Recurring[] = [
  { day: 1, description: "Payroll - Northwind Labs", cents: 260_000 },
  { day: 15, description: "Payroll - Northwind Labs", cents: 260_000 },
  { day: 1, description: "Rent - Elm Street Apartments", cents: -145_000 },
  { day: 6, description: "City Electric Co", cents: -7_400 },
  { day: 9, description: "Fiberline Internet", cents: -6_000 },
  { day: 12, description: "Brightwave Mobile", cents: -4_500 },
  { day: 3, description: "Spotify", cents: -1_199 },
  { day: 18, description: "Netflix", cents: -1_549 },
  { day: 2, description: "Iron Temple Gym", cents: -3_900 },
];

/** Variable spend: [description, min cents, max cents, times per month]. */
const VARIABLE: [string, number, number, number][] = [
  ["Trader Joe's #552", 3_500, 9_800, 4],
  ["Wegmans", 4_000, 13_000, 2],
  ["Corner Cafe", 450, 1_400, 6],
  ["Chipotle", 1_100, 1_900, 3],
  ["Uber Eats", 2_200, 4_800, 2],
  ["Uber Trip", 900, 3_200, 3],
  ["Metro Card Reload", 2_000, 4_000, 1],
  ["Shell Gas Station", 3_500, 5_500, 2],
  ["Amazon Marketplace", 1_500, 9_000, 3],
  ["Target", 2_000, 7_500, 1],
  ["Riverside Cinema", 1_400, 3_200, 1],
  ["CVS Pharmacy", 800, 4_000, 1],
];

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Build `months` months of transactions ending with the month containing `today`.
 * Days after `today` in the current month are skipped so it looks like a live account.
 */
export function generateSampleTransactions(today: Date, months = 6, seed = 42): Transaction[] {
  const rand = mulberry32(seed);
  const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const out: Transaction[] = [];
  let n = 0;

  for (let back = months - 1; back >= 0; back--) {
    const first = new Date(Date.UTC(today.getFullYear(), today.getMonth() - back, 1));
    const y = first.getUTCFullYear();
    const m = first.getUTCMonth() + 1;
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const isCurrent = back === 0;
    const lastDay = isCurrent ? today.getDate() : daysInMonth;

    const push = (day: number, description: string, cents: number) => {
      if (day > lastDay) return;
      out.push({
        id: `sample-${++n}`,
        date: `${y}-${pad(m)}-${pad(day)}`,
        description,
        amountCents: cents,
        category: categorize(description, cents, DEFAULT_RULES),
        categorySource: "rule",
      });
    };

    for (const r of MONTHLY) push(r.day, r.description, r.cents);
    for (const [description, min, max, times] of VARIABLE) {
      for (let i = 0; i < times; i++) push(between(1, daysInMonth), description, -between(min, max));
    }
    // One holiday-season splurge and one refund keep the charts honest.
    if (m === 11 || m === 12) push(between(1, daysInMonth), "Amazon Marketplace", -between(15_000, 30_000));
    if (back === 2) push(20, "Amazon Marketplace Refund", 2_499);
  }
  return out;
}

export const SAMPLE_BUDGETS: Budgets = {
  Housing: 145_000,
  Groceries: 60_000,
  Dining: 30_000,
  Transport: 25_000,
  Utilities: 20_000,
  Entertainment: 8_000,
  Shopping: 20_000,
  Health: 10_000,
};
