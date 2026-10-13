# Walkthrough: Budget Dashboard

A guide to how this project works and why it was built this way. Read it top to bottom, then try to explain each section out loud without looking.

## 1. Money is integer cents

`0.1 + 0.2` in JavaScript is `0.30000000000000004`. Summing hundreds of transactions as floats drifts, and a budget app that is off by a cent looks broken. So every amount is a **signed integer number of cents**: `-$12.34` is `-1234`. Negative is money out, positive is money in.

- Strings become cents exactly once, at the edge, in `parseAmountToCents`. It reads the digits with a regex and never calls `parseFloat`, so `"0.29"` is exactly `29`.
- Cents become strings only for display, in `formatCents`, using a cached `Intl.NumberFormat`. The division by 100 happens there and the result is never fed back into math.
- Pacing needs a fraction of a budget (`limit * day / daysInMonth`), so it rounds back to whole cents immediately.

Code: `src/lib/money.ts`, `budgetPace` in `src/lib/budget.ts`.

## 2. Treat the CSV as untrusted input

Bank exports are messy: quoted commas in merchant names, Excel's byte-order mark, US dates, accounting-style negatives. The importer:

1. Splits rows with a small RFC 4180 parser (`splitCsv`) that handles quotes, `""` escapes, CRLF and embedded newlines, and remembers the **physical line** each row started on.
2. Checks the header for the required columns. A missing column is a *fatal* file-level error.
3. Validates each row independently: column count, a real calendar date (`2026-02-30` is rejected by round-tripping through `Date.UTC`), non-empty description, a valid non-zero amount.
4. Returns good rows **and** a list of `{ line, message }` errors. The UI shows a preview and imports nothing until the user confirms.

Partial success with precise errors is friendlier than all-or-nothing, and far safer than silently dropping rows.

Code: `src/lib/csv.ts`, `src/components/ImportPanel.tsx`.

## 3. De-duplication

Users will import overlapping exports. `mergeTransactions` builds a key from `date | lowercased description | cents` and skips incoming rows whose key already exists. It deliberately does **not** de-duplicate inside a single file: two identical $4.50 coffees on the same day are two real purchases.

Trade-off: a genuinely repeated purchase that appears in two separate imports would be dropped. Banks solve this with a stable transaction ID, which most CSV exports don't include.

## 4. Categorization rules

Rules are an ordered list of `{ keyword, category }`. The first rule whose keyword appears in the description (case-insensitive) wins. Order matters: `uber eats -> Dining` must come before `uber -> Transport`. Unmatched inflows default to Income; unmatched outflows to Uncategorized.

Each transaction records `categorySource`: `rule`, `manual` or `import`. When rules change, `applyRules` re-runs them only over `rule`-sourced rows, so a category the user picked by hand (or that came in the file) is never silently overwritten. This is the same principle as not letting a batch job clobber a human's edit.

Code: `src/lib/categorize.ts`, `updateRules` in `src/hooks/useBudgetData.ts`.

## 5. Aggregation and refunds

`spendingByCategory` computes **net** spend per category: a $25 refund in Shopping reduces Shopping spend rather than counting as income. Only the Income category counts as income. `monthlySummary` produces income, expense and net per month in chronological order.

There is a property-style test that generates random ledgers and checks the invariant `income - expense == net == raw sum of amounts` for every month, plus that the monthly nets add up to the whole ledger. If a refactor ever drops or double-counts a transaction, it fails.

Code: `src/lib/aggregate.ts`, `src/lib/aggregate.test.ts`.

## 6. Budgets, thresholds and pacing

`budgetProgress` joins budgets with spending and returns `spent`, `remaining` (negative when over), an **unclamped** `ratio` (1.25 means 25% over; the UI clamps only the bar width) and a status: `ok`, `warning` from 85%, `over` past 100%. The 85% check is done in integers (`spent * 100 >= limit * 85`) so the boundary is exact.

The headline uses **linear pacing**: on day 12 of 31, an even spread would have used 12/31 of the budget. It's a rough guide (rent lands on day 1), but it answers "am I on track?" better than a raw total.

Status is always shown with an icon and a word, never color alone.

Code: `src/lib/budget.ts`, `src/components/PaceHero.tsx`, `src/components/BudgetList.tsx`.

## 7. State and persistence

All data lives in one hook, `useBudgetData`, which exposes intent-named actions (`importTransactions`, `setCategory`, `setBudget`, `addRule`...). Components never do money math; they call `src/lib` functions through `useMemo`.

Every change is saved to `localStorage` as a versioned snapshot. Loading validates the shape (including that every amount is an integer) and treats anything malformed as "no saved data". Every storage call is in `try/catch`, because Safari private mode and full quotas throw; if saving fails the header says so instead of pretending.

Code: `src/hooks/useBudgetData.ts`, `src/lib/storage.ts`.

## 8. Known limitation (be ready to discuss this)

Dates are stored as plain `YYYY-MM-DD` strings and grouped by calendar month, which is right for a single-user budget but ignores timezones entirely. A card swipe at 11:30 pm on the 31st in California may be dated the 1st by the bank. Also, the app assumes a single currency (USD); summing a EUR and a USD amount would be silently wrong. A production system would store a currency code per amount and refuse to add across currencies, as the ledger-service project does.

## Likely interview questions

1. **Why integer cents instead of floats?** Floats can't represent most decimal fractions exactly, so sums drift (section 1). Parse from strings, store integers, divide only for display.
2. **How do you handle a malformed CSV?** File-level problems are fatal; row-level problems are collected with line numbers while good rows still import, after a preview (section 2).
3. **What happens if the same file is imported twice?** Rows that already exist are skipped by a date/description/amount key; the trade-off is explained in section 3.
4. **Why are business rules outside React?** Pure functions are trivial to unit test, reusable (a server could import them), and keep components focused on rendering.
5. **How is a refund counted?** As negative spending in its own category, not as income (section 5).
6. **What if localStorage is full or blocked?** Every access is wrapped in `try/catch`; the app keeps working in memory and shows a "not being saved" warning (section 7).
7. **How would you scale this to 100k transactions?** Pre-aggregate per month when data changes instead of on each render, virtualize the table, and move parsing to a Web Worker.

## Try extending it

- Add a `currency` field and make `sumCents` refuse mixed currencies
- Add regex or amount-range rules (e.g. "over $500 at Amazon is Electronics")
- Detect recurring transactions and use them for a smarter end-of-month forecast
- Add CSV export of the filtered view
