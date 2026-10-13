import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";
import { DEFAULT_RULES } from "./lib/categorize";
import type { Transaction } from "./lib/types";

const tx = (id: string, date: string, description: string, amountCents: number, category: string): Transaction => ({
  id,
  date,
  description,
  amountCents,
  category,
  categorySource: "rule",
});

const initialData = {
  transactions: [
    tx("1", "2026-10-01", "Payroll - Northwind Labs", 300000, "Income"),
    tx("2", "2026-10-03", "Corner Cafe", -18000, "Dining"),
    tx("3", "2026-10-05", "Trader Joe's", -9000, "Groceries"),
    tx("4", "2026-09-04", "Corner Cafe", -5000, "Dining"),
  ],
  rules: DEFAULT_RULES,
  budgets: { Dining: 15000, Groceries: 50000 },
};
const today = new Date(2026, 9, 10);

describe("App", () => {
  it("shows money left this month and flags over-budget categories with text, not just color", () => {
    render(<App initialData={initialData} today={today} />);
    // Budget 650.00 - spent 270.00 = 380.00 left.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("$380.00left to spend in October 2026");
    const budgets = screen.getByRole("region", { name: "Budgets" });
    expect(within(budgets).getByText("Over budget")).toBeInTheDocument();
    expect(within(budgets).getByText("$30.00 over")).toBeInTheDocument();
  });

  it("filters transactions by search and by month", async () => {
    const user = userEvent.setup();
    render(<App initialData={initialData} today={today} />);
    const table = () => screen.getByRole("table", { name: "Transactions" });
    expect(within(table()).getAllByRole("row")).toHaveLength(4); // header + 3 October rows

    await user.type(screen.getByRole("searchbox", { name: "Search descriptions" }), "cafe");
    expect(within(table()).getAllByRole("row")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(within(table()).getByText("Sep 4")).toBeInTheDocument();
  });

  it("recategorizing a transaction by hand updates the budgets", async () => {
    const user = userEvent.setup();
    render(<App initialData={initialData} today={today} />);
    await user.selectOptions(screen.getByLabelText("Category for Corner Cafe on Oct 3"), "Groceries");
    const budgets = screen.getByRole("region", { name: "Budgets" });
    expect(within(budgets).queryByText("Over budget")).not.toBeInTheDocument();
  });

  it("previews a CSV import, reports bad lines, and imports only valid rows", async () => {
    const user = userEvent.setup();
    render(<App initialData={initialData} today={today} />);
    const csv = new File(["date,description,amount\n2026-10-06,Wegmans,-40.00\n2026-10-07,Broken,abc\n"], "bank.csv", {
      type: "text/csv",
    });
    await user.upload(screen.getByLabelText("Choose CSV file"), csv);

    expect(await screen.findByText(/1 row ready, 1 row with problems will be skipped/)).toBeInTheDocument();
    expect(screen.getByText("Line 3")).toBeInTheDocument();
    expect(screen.getByText(/"abc" is not a valid amount/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Import 1 row" }));
    expect(screen.getByText("Imported 1 transaction.")).toBeInTheDocument();
    // The rule "wegmans" -> Groceries categorized it automatically.
    expect(screen.getByLabelText("Category for Wegmans on Oct 6")).toHaveValue("Groceries");
  });

  it("rejects a file with missing columns with a clear message", async () => {
    const user = userEvent.setup();
    render(<App initialData={initialData} today={today} />);
    await user.upload(screen.getByLabelText("Choose CSV file"), new File(["when,what\n1,2"], "bad.csv", { type: "text/csv" }));
    expect(await screen.findByText(/Missing required columns: date, description, amount/)).toBeInTheDocument();
  });
});
