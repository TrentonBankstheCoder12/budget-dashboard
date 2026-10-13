# Budget Dashboard

[![CI](https://github.com/TrentonBankstheCoder12/budget-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/TrentonBankstheCoder12/budget-dashboard/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18?logo=vitest&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

**Live demo:** https://trentonbanksthecoder12.github.io/budget-dashboard/ (goes live once GitHub Pages is enabled for the repo)

A **personal finance dashboard** that turns a bank's CSV export into an answer to one question: *how much can I still spend this month?* It imports and validates transactions, auto-categorizes them with editable keyword rules, tracks monthly budgets with pacing and over-budget warnings, and charts where the money went. It is built like a small piece of fintech software rather than a toy: money is stored as **integer cents**, untrusted input is validated with line-level error messages, and all of the financial logic lives in pure, unit-tested TypeScript modules separate from the UI.

## Features

- **CSV import with validation:** RFC 4180 quoting, ISO or US dates, `$1,234.50` / `(45.00)` amounts. Bad rows are listed by line number with the reason; nothing is added until you confirm
- **Duplicate protection:** re-importing the same bank export skips rows you already have
- **Rule-based categorization:** ordered keyword rules (first match wins), editable in the UI. Editing a rule re-categorizes past transactions, but never overrides a category you set by hand
- **Monthly budgets:** progress bars, "close to limit" (85%) and "over budget" states with icon + text, and a pace marker showing whether spending is ahead of the calendar
- **Charts (Recharts):** spending by category, monthly trend against budget, income vs spending; each has a "Show table" view so no number is hover-only
- **Filters:** month, category and free-text search scope the table, and the category filter carries into the trend chart
- **Exact money math:** integer cents everywhere; `Intl.NumberFormat` only at display time
- **Local persistence:** `localStorage` with schema validation and `try/catch` so private mode or a full quota degrades to in-memory instead of crashing
- **Light and dark mode**, responsive down to phone width, keyboard accessible

## Architecture

```
  CSV file / form input (strings)
            │
            ▼
 ┌─────────────────────┐   src/lib: pure TypeScript, no React, fully unit tested
 │ csv.ts   money.ts   │── parse + validate, strings -> integer cents (once, at the edge)
 │ categorize.ts       │── ordered keyword rules -> category
 │ aggregate.ts        │── filter, spending by category, monthly income/expense
 │ budget.ts           │── progress, status thresholds, pacing
 │ storage.ts          │── versioned, validated localStorage snapshot
 └─────────┬───────────┘
           ▼
 ┌─────────────────────┐
 │ hooks/useBudgetData │── single owner of app state; exposes intent-named actions
 └─────────┬───────────┘
           ▼
 ┌─────────────────────┐
 │ App + components    │── PaceHero, BudgetList, Charts, TransactionTable,
 └─────────────────────┘   ImportPanel, RulesPanel (render only, no money math)
```

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (relative paths, works on GitHub Pages)
```

The first visit loads six months of deterministic sample data. Use **Delete all data** in the footer to start fresh with your own CSV.

## Usage example

Import a CSV like this (spending is negative; `category` is optional):

```csv
date,description,amount
2026-10-01,Payroll - Northwind Labs,2600.00
2026-10-02,Trader Joe's,-54.20
10/03/2026,"Corner Cafe, Main St",-6.75
2026-10-04,Bookstore,12.345
```

The preview reports `3 rows ready, 1 row with problems will be skipped` and lists `Line 5 "12.345" is not a valid amount`. The library can also be used directly:

```ts
import { parseTransactionsCsv } from "./src/lib/csv";
import { spendingByCategory } from "./src/lib/aggregate";
import { budgetProgress } from "./src/lib/budget";
import { DEFAULT_RULES } from "./src/lib/categorize";

const { transactions, errors } = parseTransactionsCsv(csvText, DEFAULT_RULES);
const rows = budgetProgress({ Dining: 30_000 }, spendingByCategory(transactions));
// rows[0] -> { category: "Dining", spentCents: 675, remainingCents: 29325, status: "ok", ... }
```

## Testing

```bash
npm test           # vitest + jsdom
npm run lint       # tsc --noEmit (strict)
```

The suite covers amount parsing edge cases (`0.29`, `(45.00)`, `-0`), RFC 4180 quoting and line numbers, impossible dates, per-row import errors, de-duplication, rule ordering and manual overrides, refunds netting against their category, budget thresholds at the exact boundary, pacing, corrupted or throwing `localStorage`, and a **property-style invariant** that monthly aggregation never creates or loses a cent across randomly generated ledgers. React Testing Library tests drive the real UI: filtering, recategorizing, editing a budget, and importing a file with errors.

## What I'd add next

- Multi-currency accounts (store an ISO currency per transaction and refuse to sum across currencies)
- Split transactions (one Costco receipt across Groceries and Household)
- Recurring-transaction detection to forecast the rest of the month instead of linear pacing
- Column mapping on import, since every bank names its CSV headers differently

See [WALKTHROUGH.md](WALKTHROUGH.md) for the design decisions behind this project.

## License

MIT
