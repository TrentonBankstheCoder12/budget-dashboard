import { categorize } from "./categorize";
import { parseAmountToCents } from "./money";
import { newId } from "./id";
import type { Rule, Transaction } from "./types";

/**
 * CSV import. The goal is to never silently import bad money data: every
 * rejected row is reported with its line number and the reason, and the
 * good rows are still returned so the user can decide what to do.
 */

export interface RowError {
  /** 1-based line number in the file, matching what a spreadsheet shows. */
  line: number;
  message: string;
}

export interface ImportResult {
  transactions: Transaction[];
  errors: RowError[];
  /** A problem with the file as a whole (no header, missing columns). */
  fatal?: string;
}

/**
 * Split CSV text into rows of fields, following RFC 4180 quoting:
 * fields may be wrapped in double quotes, and "" inside quotes is a literal quote.
 * Quoted fields may contain commas and newlines. Returns each row with the line
 * number where it started, so errors can point at the right place.
 */
export function splitCsv(text: string): { line: number; fields: string[] }[] {
  const rows: { line: number; fields: string[] }[] = [];
  let field = "";
  let fields: string[] = [];
  let inQuotes = false;
  let line = 1;
  let rowStart = 1;

  const endRow = () => {
    fields.push(field);
    // Skip fully blank lines (common at end of exported files).
    if (!(fields.length === 1 && fields[0].trim() === "")) rows.push({ line: rowStart, fields });
    fields = [];
    field = "";
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        if (ch === "\n") line++;
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRow();
      line++;
      rowStart = line;
    } else {
      field += ch;
    }
  }
  if (field !== "" || fields.length > 0) endRow();
  return rows;
}

/**
 * Normalize a date to ISO YYYY-MM-DD. Accepts ISO or US-style M/D/YYYY.
 * Rejects impossible dates like 2026-02-30 by round-tripping through Date.UTC.
 */
export function parseDate(raw: string): string | null {
  const text = raw.trim();
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text))) {
    [m, d, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    return null;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const REQUIRED = ["date", "description", "amount"] as const;

export function parseTransactionsCsv(
  text: string,
  rules: readonly Rule[],
  makeId: () => string = () => newId("tx"),
): ImportResult {
  // Strip a UTF-8 byte-order mark that Excel likes to add.
  const rows = splitCsv(text.replace(/^﻿/, ""));
  if (rows.length === 0) return { transactions: [], errors: [], fatal: "The file is empty." };

  const header = rows[0].fields.map((h) => h.trim().toLowerCase());
  const missing = REQUIRED.filter((col) => !header.includes(col));
  if (missing.length > 0) {
    return {
      transactions: [],
      errors: [],
      fatal: `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. The first row must be a header with date, description and amount.`,
    };
  }
  const col = {
    date: header.indexOf("date"),
    description: header.indexOf("description"),
    amount: header.indexOf("amount"),
    category: header.indexOf("category"),
  };

  const transactions: Transaction[] = [];
  const errors: RowError[] = [];

  for (const { line, fields } of rows.slice(1)) {
    if (fields.length !== header.length) {
      errors.push({ line, message: `expected ${header.length} columns but found ${fields.length}` });
      continue;
    }
    const date = parseDate(fields[col.date]);
    if (!date) {
      errors.push({ line, message: `"${fields[col.date].trim()}" is not a valid date (use YYYY-MM-DD or MM/DD/YYYY)` });
      continue;
    }
    const description = fields[col.description].trim();
    if (!description) {
      errors.push({ line, message: "description is empty" });
      continue;
    }
    const amount = parseAmountToCents(fields[col.amount]);
    if (!amount.ok) {
      errors.push({ line, message: amount.error });
      continue;
    }
    if (amount.cents === 0) {
      errors.push({ line, message: "amount is zero" });
      continue;
    }

    // An explicit category column wins over rules; it is what the bank or user said.
    const given = col.category >= 0 ? fields[col.category].trim() : "";
    transactions.push({
      id: makeId(),
      date,
      description,
      amountCents: amount.cents,
      category: given || categorize(description, amount.cents, rules),
      categorySource: given ? "import" : "rule",
    });
  }

  return { transactions, errors };
}

/** Key used to spot a re-imported transaction. Same day, text and amount = same transaction. */
const dedupeKey = (tx: Pick<Transaction, "date" | "description" | "amountCents">) =>
  `${tx.date}|${tx.description.toLowerCase()}|${tx.amountCents}`;

/**
 * Merge imported transactions into existing ones, skipping rows that already
 * exist so importing the same bank export twice does not double-count spending.
 * Only existing rows are checked: two identical coffees on the same day inside
 * one file are both real purchases and are both kept.
 */
export function mergeTransactions(
  existing: readonly Transaction[],
  incoming: readonly Transaction[],
): { merged: Transaction[]; skipped: number } {
  const seen = new Set(existing.map(dedupeKey));
  const merged = [...existing];
  let skipped = 0;
  for (const tx of incoming) {
    const key = dedupeKey(tx);
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    merged.push(tx);
  }
  return { merged, skipped };
}
