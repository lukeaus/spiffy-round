export type RoundingRule =
  | "toNearestOrAwayFromZero"
  | "toNearestOrEven"
  | "up"
  | "down"
  | "towardZero"
  | "awayFromZero";

export interface RoundingOptions {
  roundingRule?: RoundingRule;
}

const DEFAULT_RULE: RoundingRule = "toNearestOrAwayFromZero";

const isZeroIsh = (val: string): boolean =>
  /^[+-]?[.]?[0,]*[.]?[0]*$/.test(val);

const isOnlyZeros = (val: string): boolean => /^[0]+$/.test(val);

const decimals = (val: string): string =>
  val.includes(".") ? (val.split(".").pop() ?? "") : "";

const nonDecimals = (val: string): string =>
  val.includes(".") ? val.split(".").slice(0, -1).join("") : val;

// remove decimals if all are zeros
const stripUnrequiredTrailingZeros = (val: string): string => {
  const d = decimals(val);
  if (d && isOnlyZeros(d)) {
    return nonDecimals(val);
  }
  return val;
};

/*
 * Return a string with zero filled decimal places up to the number of decimal places.
 * Deliberately avoids Number.toPrecision due to it's imprecise precision.
 */
const fillUnfilledDecimalPlaces = (
  value: number | string,
  decimalPlaces: number,
): string => {
  const places = Math.abs(decimalPlaces);
  const val = String(value);
  if (!places) return val;
  let decimal = decimals(val);
  while (decimal.length < places) {
    decimal += "0";
  }
  return nonDecimals(val) + "." + decimal;
};

/*
 * Round to `places` decimals using an explicit rule. Mirrors round-to's
 * toPrecision(15) correction so float-repr noise (e.g. 1.005 stored as
 * 1.00499..., 1.2*100 -> 120.000...1) does not corrupt rounding. All rules,
 * including the default toNearestOrAwayFromZero, route through here.
 */
const roundWithRule = (
  val: string,
  places: number,
  rule: RoundingRule,
): string => {
  const n = Number(val);
  if (!Number.isFinite(n)) return String(n);
  const p = Math.trunc(places);
  const power = 10 ** p;
  const scaled = Number.parseFloat((n * power).toPrecision(15));
  let rounded: number;
  switch (rule) {
    case "up":
      rounded = Math.ceil(scaled);
      break;
    case "down":
      rounded = Math.floor(scaled);
      break;
    case "towardZero":
      rounded = Math.trunc(scaled);
      break;
    case "awayFromZero":
      rounded = scaled >= 0 ? Math.ceil(scaled) : Math.floor(scaled);
      break;
    case "toNearestOrEven": {
      const frac = Math.abs(scaled - Math.trunc(scaled));
      const epsilon = Number.EPSILON * Math.abs(scaled) * 8;
      if (Math.abs(frac - 0.5) <= Math.max(epsilon, 1e-10)) {
        const floor = Math.floor(scaled);
        rounded = floor % 2 === 0 ? floor : Math.ceil(scaled);
      } else {
        rounded = Math.round(scaled);
      }
      break;
    }
    default:
      rounded = scaled < 0 ? -Math.round(Math.abs(scaled)) : Math.round(scaled);
      break;
  }
  return (rounded / power).toFixed(p);
};

/*
 * Return a string that has been rounded to decimalPlaces where that rounding should occur
 */
const spiffyRound = Object.assign(
  (
    value: number | string = "",
    decimalPlaces: number = 0,
    options?: RoundingOptions,
  ): string => {
    const places = Math.abs(decimalPlaces);
    const rule = options?.roundingRule ?? DEFAULT_RULE;
    let val = String(value);
    if (val.startsWith(".")) {
      val = "0" + val;
    }
    if (val.endsWith(".")) {
      val = val.slice(0, -1);
    }
    if (val.includes(".")) {
      // All rules (default included) round via roundWithRule, which applies
      // the toPrecision(15) float-repr correction (fixes 1.005 -> "1.01").
      val = roundWithRule(val, places, rule);
      val = fillUnfilledDecimalPlaces(val, places);
      val = stripUnrequiredTrailingZeros(val);
    }
    if (val === "") return "";
    return isZeroIsh(val) ? "0" : val;
  },
  { fillUnfilledDecimalPlaces },
);

export default spiffyRound;
