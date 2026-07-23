import { describe, it } from "node:test";
import assert from "node:assert/strict";
import spiffyRound from "./index.js";

const { fillUnfilledDecimalPlaces } = spiffyRound;

describe("VAL-BEHAVIOR-001: primary API remains directly callable", () => {
  it("returns strings for documented number and string values", () => {
    assert.equal(spiffyRound(1), "1");
    assert.equal(spiffyRound("1.2"), "1");
    assert.equal(typeof spiffyRound(1.2, 2), "string");
    assert.equal(typeof spiffyRound("1.2", 2), "string");
  });
  it("returns empty string for no value or explicit undefined", () => {
    assert.equal(spiffyRound(), "");
    assert.equal(spiffyRound(undefined), "");
  });
});

describe("VAL-BEHAVIOR-002: decimal precision defaults and integer handling", () => {
  it("treats omitted precision like zero", () => {
    assert.equal(spiffyRound(1.1), "1");
    assert.equal(spiffyRound("1.1"), "1");
  });
  it("leaves numeric integers unpadded when precision is requested", () => {
    assert.equal(spiffyRound(1, 2), "1");
    assert.equal(spiffyRound(1.0, 2), "1");
    assert.equal(spiffyRound(+1.0, 2), "1");
    assert.equal(spiffyRound(-1.0, 2), "-1");
  });
  it("preserves lexical form of integer strings including signs and leading zeros", () => {
    assert.equal(spiffyRound("1", 2), "1");
    assert.equal(spiffyRound("001", 2), "001");
    assert.equal(spiffyRound("+1", 2), "+1");
    assert.equal(spiffyRound("-1", 2), "-1");
  });
});

describe("VAL-BEHAVIOR-003: fractions round and pad consistently", () => {
  it("rounds and pads number inputs", () => {
    assert.equal(spiffyRound(1.1, 2), "1.10");
    assert.equal(spiffyRound(1.256, 2), "1.26");
    assert.equal(spiffyRound(0.1, 2), "0.10");
  });
  it("rounds and pads string inputs", () => {
    assert.equal(spiffyRound("1.1", 2), "1.10");
    assert.equal(spiffyRound("1.256", 2), "1.26");
    assert.equal(spiffyRound("1.100", 2), "1.10");
  });
});

describe("VAL-BEHAVIOR-004: half-step decimals round with float-repr correction", () => {
  it("rounds 1.005 family up at precision 2 (corrected, not toFixed)", () => {
    assert.equal(spiffyRound(1.005, 2), "1.01");
    assert.equal(spiffyRound(+1.005, 2), "1.01");
    assert.equal(spiffyRound(-1.005, 2), "-1.01");
    assert.equal(spiffyRound("1.005", 2), "1.01");
    assert.equal(spiffyRound("+1.005", 2), "1.01");
    assert.equal(spiffyRound("-1.005", 2), "-1.01");
  });
  it("rounds 1.006 family up at precision 2", () => {
    assert.equal(spiffyRound(1.006, 2), "1.01");
    assert.equal(spiffyRound(+1.006, 2), "1.01");
    assert.equal(spiffyRound(-1.006, 2), "-1.01");
    assert.equal(spiffyRound("1.006", 2), "1.01");
    assert.equal(spiffyRound("+1.006", 2), "1.01");
    assert.equal(spiffyRound("-1.006", 2), "-1.01");
  });
});

describe("VAL-BEHAVIOR-005: decimal text normalization is preserved", () => {
  it("normalizes leading-dot, trailing-dot, and signed decimals at precision 2", () => {
    assert.equal(spiffyRound(".1", 2), "0.10");
    assert.equal(spiffyRound("1.", 2), "1");
    assert.equal(spiffyRound("+1.1", 2), "1.10");
    assert.equal(spiffyRound("-1.1", 2), "-1.10");
  });
  it("rounds and pads other decimal strings under behavior 003", () => {
    assert.equal(spiffyRound(".0", 2), "0");
  });
});

describe("VAL-BEHAVIOR-006: zero normalization and all-zero fractions", () => {
  it("canonicalizes numeric and string zeros", () => {
    assert.equal(spiffyRound(+0), "0");
    assert.equal(spiffyRound(-0), "0");
    assert.equal(spiffyRound("+0"), "0");
    assert.equal(spiffyRound("-0"), "0");
    assert.equal(spiffyRound("0.00"), "0");
    assert.equal(spiffyRound("0.000", 2), "0");
    assert.equal(spiffyRound(0.0, 2), "0");
    assert.equal(spiffyRound("0", 2), "0");
  });
});

describe("VAL-BEHAVIOR-007: precision coercion and errors remain compatible", () => {
  it("uses the magnitude of negative precision", () => {
    assert.equal(spiffyRound(1.256, -2), "1.26");
    assert.equal(spiffyRound("1.256", -2), "1.26");
  });
  it("preserves fractional precision coercion and padding", () => {
    assert.equal(spiffyRound("1.2", 2.7), "1.200");
  });
  it("throws RangeError only for decimal-bearing inputs in native toFixed range", () => {
    assert.throws(() => spiffyRound(1.1, 101), RangeError);
    assert.throws(() => spiffyRound("1.1", 101), RangeError);
  });
  it("lets integer-style lexical inputs bypass native rounding", () => {
    assert.equal(spiffyRound("1", 101), "1");
    assert.doesNotThrow(() => spiffyRound("1", 101));
  });
});

describe("VAL-BEHAVIOR-008: permissive runtime compatibility is preserved", () => {
  it("leaves exponent text without a decimal point unexpanded", () => {
    assert.equal(spiffyRound("1e3"), "1e3");
  });
  it("retains stringification for observed undocumented runtime values", () => {
    // @ts-expect-error: boolean is not in the documented static type (runtime permissive case)
    assert.equal(spiffyRound(true), "true");
    // @ts-expect-error: null is not in the documented static type (runtime permissive case)
    assert.equal(spiffyRound(null), "null");
  });
  it("retains native conversion behavior for invalid decimal text", () => {
    assert.equal(spiffyRound("abc.def", 2), "NaN");
  });
  it("returns zero for existing zero-like comma forms", () => {
    assert.equal(spiffyRound("0,0"), "0");
    assert.equal(spiffyRound(","), "0");
  });
});

describe("VAL-BEHAVIOR-009: fill helper remains attached and callable", () => {
  it("exposes fillUnfilledDecimalPlaces as a callable property", () => {
    assert.equal(typeof spiffyRound.fillUnfilledDecimalPlaces, "function");
    assert.equal(
      spiffyRound.fillUnfilledDecimalPlaces,
      fillUnfilledDecimalPlaces,
    );
  });
});

describe("VAL-BEHAVIOR-010: fill helper pads without rounding or truncating", () => {
  it("fills missing decimal positions", () => {
    assert.equal(fillUnfilledDecimalPlaces("1", 2), "1.00");
    assert.equal(fillUnfilledDecimalPlaces("1.", 2), "1.00");
    assert.equal(fillUnfilledDecimalPlaces("1.0", 2), "1.00");
  });
  it("does not truncate or round an already-long fractional part", () => {
    assert.equal(fillUnfilledDecimalPlaces("1.234", 2), "1.234");
  });
  it("uses the magnitude of negative precision", () => {
    assert.equal(fillUnfilledDecimalPlaces("1", -2), "1.00");
  });
  it("leaves values unchanged when precision is omitted or zero", () => {
    assert.equal(fillUnfilledDecimalPlaces("1.5", 0), "1.5");
  });
});

describe("VAL-BEHAVIOR-011: fill helper preserves runtime stringification", () => {
  it("stringifies undefined before padding", () => {
    // @ts-expect-error: undefined is not in the documented static type (runtime permissive case)
    assert.equal(fillUnfilledDecimalPlaces(undefined), "undefined");
    // @ts-expect-error: undefined is not in the documented static type (runtime permissive case)
    assert.equal(fillUnfilledDecimalPlaces(undefined, 0), "undefined");
    // @ts-expect-error: undefined is not in the documented static type (runtime permissive case)
    assert.equal(fillUnfilledDecimalPlaces(undefined, 2), "undefined.00");
  });
});

describe("VAL-BEHAVIOR-012: runtime compatibility does not widen static types", () => {
  it("keeps documented number and string calls callable from TypeScript", () => {
    const fromNumber: string = spiffyRound(1.256, 2);
    const fromString: string = spiffyRound("1.256", 2);
    const omitted: string = spiffyRound();
    assert.equal(fromNumber, "1.26");
    assert.equal(fromString, "1.26");
    assert.equal(omitted, "");
  });
  it("rejects unsupported object input at the type level", () => {
    // @ts-expect-error: object input is not in the documented static type
    spiffyRound({ value: 1 });
  });
});

describe("VAL-BEHAVIOR-013: explicit roundingRule option", () => {
  const up = { roundingRule: "up" as const };
  const down = { roundingRule: "down" as const };
  const towardZero = { roundingRule: "towardZero" as const };
  const awayFromZero = { roundingRule: "awayFromZero" as const };
  const even = { roundingRule: "toNearestOrEven" as const };
  const away = { roundingRule: "toNearestOrAwayFromZero" as const };

  it("explicit default rule matches the no-options path", () => {
    // 1.005 -> "1.01" via toPrecision(15) float-repr correction
    assert.equal(spiffyRound(1.005, 2, away), "1.01");
    assert.equal(spiffyRound(1.256, 2, away), "1.26");
  });

  it("rounds toNearestOrEven (banker's) at ties", () => {
    assert.equal(spiffyRound(5.5, 0, even), "6");
    assert.equal(spiffyRound(4.5, 0, even), "4");
    assert.equal(spiffyRound(-5.5, 0, even), "-6");
    assert.equal(spiffyRound(-4.5, 0, even), "-4");
  });

  it("rounds up toward +Infinity", () => {
    assert.equal(spiffyRound(5.2, 0, up), "6");
    assert.equal(spiffyRound(5.5, 0, up), "6");
    assert.equal(spiffyRound(-5.2, 0, up), "-5");
    assert.equal(spiffyRound(-5.5, 0, up), "-5");
    assert.equal(spiffyRound(1.004, 2, up), "1.01");
    assert.equal(spiffyRound(-0.375, 2, up), "-0.37");
  });

  it("rounds down toward -Infinity", () => {
    assert.equal(spiffyRound(5.2, 0, down), "5");
    assert.equal(spiffyRound(5.5, 0, down), "5");
    assert.equal(spiffyRound(-5.2, 0, down), "-6");
    assert.equal(spiffyRound(-5.5, 0, down), "-6");
    assert.equal(spiffyRound(1.006, 2, down), "1");
    assert.equal(spiffyRound(-0.375, 2, down), "-0.38");
  });

  it("rounds towardZero (truncate)", () => {
    assert.equal(spiffyRound(5.2, 0, towardZero), "5");
    assert.equal(spiffyRound(5.5, 0, towardZero), "5");
    assert.equal(spiffyRound(-5.2, 0, towardZero), "-5");
    assert.equal(spiffyRound(-5.5, 0, towardZero), "-5");
  });

  it("rounds awayFromZero", () => {
    assert.equal(spiffyRound(5.2, 0, awayFromZero), "6");
    assert.equal(spiffyRound(5.5, 0, awayFromZero), "6");
    assert.equal(spiffyRound(-5.2, 0, awayFromZero), "-6");
    assert.equal(spiffyRound(-5.5, 0, awayFromZero), "-6");
  });
});
