/**
 * Money helpers. Amounts live as integer cents everywhere in the app so that
 * sums are exact: 0.1 + 0.2 !== 0.3 in floating point, but 10 + 20 === 30.
 * Strings are converted to cents exactly once, at the edge (CSV import / forms).
 */

export type ParseResult = { ok: true; cents: number } | { ok: false; error: string };

// Optional sign, optional $, digits with optional thousands commas, up to 2 decimals.
const AMOUNT_RE = /^([+-])?\$?((?:\d{1,3}(?:,\d{3})+)|\d+)?(?:\.(\d{1,2}))?$/;

/**
 * Parse a human-entered amount ("-1,234.50", "$12", "(45.00)") into signed cents.
 * Parsing is done on the string digits, never via parseFloat, so "0.29" is
 * exactly 29 cents rather than 28.999999.
 */
export function parseAmountToCents(raw: string): ParseResult {
  let text = raw.trim().replace(/\s+/g, "");
  if (text === "") return { ok: false, error: "amount is empty" };

  // Accounting notation: (12.50) means -12.50.
  let negative = false;
  if (text.startsWith("(") && text.endsWith(")")) {
    negative = true;
    text = text.slice(1, -1);
  }

  const match = AMOUNT_RE.exec(text);
  if (!match || (match[2] === undefined && match[3] === undefined)) {
    return { ok: false, error: `"${raw.trim()}" is not a valid amount (expected e.g. -42.50)` };
  }
  if (match[1] === "-") negative = !negative;

  const whole = Number((match[2] ?? "0").replaceAll(",", ""));
  const fraction = Number((match[3] ?? "0").padEnd(2, "0"));
  const cents = whole * 100 + fraction;
  if (!Number.isSafeInteger(cents)) return { ok: false, error: `"${raw.trim()}" is too large` };

  // Avoid returning -0, which would format as "-$0.00".
  return { ok: true, cents: negative && cents !== 0 ? -cents : cents };
}

const formatters = new Map<string, Intl.NumberFormat>();

/** Format cents for display. Formatters are cached because construction is slow. */
export function formatCents(cents: number, opts: { currency?: string; locale?: string; compact?: boolean } = {}): string {
  const { currency = "USD", locale = "en-US", compact = false } = opts;
  const key = `${locale}|${currency}|${compact}`;
  let fmt = formatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      ...(compact ? { notation: "compact", maximumFractionDigits: 1 } : {}),
    });
    formatters.set(key, fmt);
  }
  // Division happens only here, for display; never feed the result back into math.
  return fmt.format(cents / 100);
}

/** Sum a list of cent values. Integers in, integer out. */
export function sumCents(values: Iterable<number>): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}
