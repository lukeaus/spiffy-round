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
 * Return a string that has been rounded to decimalPlaces where that rounding should occur
 */
const spiffyRound = Object.assign(
  (value: number | string = "", decimalPlaces: number = 0): string => {
    const places = Math.abs(decimalPlaces);
    let val = String(value);
    if (val.startsWith(".")) {
      val = "0" + val;
    }
    if (val.endsWith(".")) {
      val = val.slice(0, -1);
    }
    if (val.includes(".")) {
      val = String(Number(val).toFixed(places));
      val = fillUnfilledDecimalPlaces(val, places);
      val = stripUnrequiredTrailingZeros(val);
    }
    if (val === "") return "";
    return isZeroIsh(val) ? "0" : val;
  },
  { fillUnfilledDecimalPlaces },
);

export default spiffyRound;
