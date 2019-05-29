const isZeroIsh = val => /^[+-]?[.]?[0,]*[.]?[0]*$/.test(val);
const isOnlyZeros = val => /^[0]+$/.test(val);
const decimals = (val = "") => (val.includes(".") ? val.split(".").pop() : "");
const nonDecimals = (val = "") =>
  val.includes(".")
    ? val
        .split(".")
        .slice(0, -1)
        .join("")
    : val;
// remove decimals if all are zeros
const stripUnrequiredTrailingZeros = (val = "", decimalPlaces) => {
  const _decimals = decimals(val);
  if (_decimals && isOnlyZeros(_decimals)) {
    return nonDecimals(val);
  }
  return val;
};

/*
 * Return a string with zero filled decimal places up to the number of decimal places.
 * Deliberately avoids Number.toPrecision due to it's imprecise precision.
 */
const fillUnfilledDecimalPlaces = (val, decimalPlaces) => {
  decimalPlaces = Math.abs(decimalPlaces);
  val = String(val);
  if (!decimalPlaces) return val;
  let decimal = decimals(val);
  while (decimal.length < decimalPlaces) {
    decimal += "0";
  }
  val = nonDecimals(val) + "." + decimal;
  return val;
};

/*
 * Return a string that has been rounded to decimalPlaces where that rounding should occur
 */
const spiffyRound = (val = "", decimalPlaces = 0) => {
  decimalPlaces = Math.abs(decimalPlaces);
  val = String(val);
  if (val.startsWith(".")) {
    val = "0" + val;
  }
  if (val.endsWith(".")) {
    val = val.slice(0, -1);
  }
  if (val.includes(".")) {
    val = String(Number(val).toFixed(decimalPlaces));
    val = fillUnfilledDecimalPlaces(val, decimalPlaces);
    val = stripUnrequiredTrailingZeros(val, decimalPlaces);
  }
  if (val === "") return "";
  return isZeroIsh(val) ? "0" : val;
};

const moduleExport = (module.exports = spiffyRound);
moduleExport.fillUnfilledDecimalPlaces = fillUnfilledDecimalPlaces;
