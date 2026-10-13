import { describe, expect, it } from "vitest";
import { mergeTransactions, parseDate, parseTransactionsCsv, splitCsv } from "./csv";
import type { Rule } from "./types";

const rules: Rule[] = [{ id: "1", keyword: "coffee", category: "Dining" }];
let n = 0;
const makeId = () => `id-${++n}`;

describe("splitCsv", () => {
  it("handles quoted commas, escaped quotes, CRLF and embedded newlines", () => {
    const rows = splitCsv('a,b\r\n"x, y","say ""hi"""\r\n"multi\nline",z\n');
    expect(rows.map((r) => r.fields)).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
      ["multi\nline", "z"],
    ]);
    // Line numbers track the physical line where each row starts.
    expect(rows.map((r) => r.line)).toEqual([1, 2, 3]);
  });
});

describe("parseDate", () => {
  it("accepts ISO and US formats and rejects impossible dates", () => {
    expect(parseDate("2026-03-05")).toBe("2026-03-05");
    expect(parseDate("3/5/2026")).toBe("2026-03-05");
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("2025-02-29")).toBeNull();
    expect(parseDate("2024-02-29")).toBe("2024-02-29");
    expect(parseDate("March 5")).toBeNull();
  });
});

describe("parseTransactionsCsv", () => {
  it("imports valid rows, categorizes them, and reports bad rows by line number", () => {
    const csv = [
      "Date,Description,Amount",
      "2026-03-01,Coffee Shop,-4.50",
      "2026-03-02,Paycheck,2500.00",
      "not-a-date,Thing,-1",
      "2026-03-03,,-1",
      "2026-03-04,Bad amount,12.345",
      "2026-03-05,Too,many,columns",
      "2026-03-06,Free sample,0",
    ].join("\n");
    const result = parseTransactionsCsv(csv, rules, makeId);

    expect(result.fatal).toBeUndefined();
    expect(result.transactions.map((t) => [t.description, t.amountCents, t.category])).toEqual([
      ["Coffee Shop", -450, "Dining"],
      ["Paycheck", 250000, "Income"],
    ]);
    expect(result.errors.map((e) => e.line)).toEqual([4, 5, 6, 7, 8]);
    expect(result.errors[0].message).toMatch(/not a valid date/);
    expect(result.errors[3].message).toMatch(/expected 3 columns but found 4/);
  });

  it("uses an explicit category column over rules", () => {
    const result = parseTransactionsCsv("date,description,amount,category\n2026-03-01,Coffee,-3,Gifts", rules, makeId);
    expect(result.transactions[0]).toMatchObject({ category: "Gifts", categorySource: "import" });
  });

  it("reports missing columns as a fatal, file-level error", () => {
    const result = parseTransactionsCsv("when,what\n2026-01-01,x", rules, makeId);
    expect(result.fatal).toMatch(/Missing required columns: date, description, amount/);
    expect(result.transactions).toHaveLength(0);
  });

  it("strips a UTF-8 BOM from the header", () => {
    const result = parseTransactionsCsv("﻿date,description,amount\n2026-01-01,Coffee,-2", rules, makeId);
    expect(result.transactions).toHaveLength(1);
  });
});

describe("mergeTransactions", () => {
  it("skips rows already present but keeps same-day duplicates within one import", () => {
    const base = parseTransactionsCsv("date,description,amount\n2026-03-01,Coffee,-3", rules, makeId).transactions;
    const again = parseTransactionsCsv(
      "date,description,amount\n2026-03-01,COFFEE,-3\n2026-03-02,Coffee,-3\n2026-03-02,Coffee,-3",
      rules,
      makeId,
    ).transactions;
    const { merged, skipped } = mergeTransactions(base, again);
    expect(skipped).toBe(1);
    expect(merged).toHaveLength(3);
  });
});
