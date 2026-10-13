import { describe, expect, it } from "vitest";
import { formatCents, parseAmountToCents, sumCents } from "./money";

describe("parseAmountToCents", () => {
  it.each([
    ["12.34", 1234],
    ["-12.34", -1234],
    ["$1,234.50", 123450],
    ["-$5", -500],
    ["(45.00)", -4500],
    ["0.29", 29],
    [".5", 50],
    ["  7.1 ", 710],
    ["+3", 300],
  ])("parses %s as %d cents", (input, cents) => {
    expect(parseAmountToCents(input)).toEqual({ ok: true, cents });
  });

  it.each(["", "abc", "1.234", "12,34", "1,23.00", "--5", "$", "1e3"])("rejects %j with a message", (input) => {
    const result = parseAmountToCents(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });

  it("never produces negative zero", () => {
    const result = parseAmountToCents("-0.00");
    expect(result.ok && Object.is(result.cents, 0)).toBe(true);
  });
});

describe("formatCents", () => {
  it("formats signed cents as currency", () => {
    expect(formatCents(123456)).toBe("$1,234.56");
    expect(formatCents(-5)).toBe("-$0.05");
  });

  it("supports other currencies and locales", () => {
    // Intl may use a narrow no-break space before the euro sign; normalize it.
    expect(formatCents(123456, { currency: "EUR", locale: "de-DE" }).replace(/\s/g, " ")).toBe("1.234,56 €");
  });
});

describe("sumCents", () => {
  it("is exact where float math is not", () => {
    // 0.1 + 0.2 in dollars drifts; 10 + 20 in cents never does.
    const tenCents = Array.from({ length: 1000 }, () => 10);
    expect(sumCents(tenCents)).toBe(10000);
    expect(tenCents.reduce((a, c) => a + c / 100, 0)).not.toBe(100);
  });
});
