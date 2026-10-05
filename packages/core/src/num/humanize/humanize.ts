/**
 * Humanizes large numbers into a more readable format using suffixes like K, M, B, T (thousand, million, billion, trillion).
 *
 * @param {number | string} input - The number or string to humanize.
 * If the input is a string, it will be parsed into a number.
 * @param {number} [decimals=1] - The number of decimal places to display. Default is 1.
 * @returns {string} A humanized string representation of the number.
 *
 * @example
 * humanize(1000000);
 * // Returns: '1M'
 *
 * @example
 * humanize(1234567890);
 * // Returns: '1.2B'
 *
 * @example
 * humanize(9876543210, 2);
 * // Returns: '9.88B'
 *
 * @example
 * humanize(500);
 * // Returns: '500'
 *
 * @example
 * humanize('1000000');
 * // Returns: '1M'
 *
 * @group Numbers
 */
const UNITS: readonly [number, string][] = [
  [1e3, 'k'],
  [1e6, 'M'],
  [1e9, 'B'],
  [1e12, 'T'],
];

export function humanize(input: number | string, decimals = 1): string {
  if (input === null || input === undefined) {
    return String(input);
  }

  decimals = Math.max(decimals, 0);

  const number = parseInt(input as string, 10);

  if (!Number.isFinite(number)) {
    return String(input);
  }

  const signString = number < 0 ? '-' : '';
  const unsignedNumber = Math.abs(number);

  if (unsignedNumber < 1000) {
    return `${signString}${unsignedNumber}`;
  }

  if (unsignedNumber >= 1e16) {
    return number.toExponential(decimals).replace('e+', 'x10^');
  }

  const factor = 10 ** decimals;

  let unitIndex = UNITS.length - 1;
  while (unsignedNumber < UNITS[unitIndex][0]) unitIndex--;

  let value =
    Math.round((unsignedNumber * factor) / UNITS[unitIndex][0]) / factor;

  if (value >= 1000 && unitIndex < UNITS.length - 1) {
    unitIndex++;
    value =
      Math.round((unsignedNumber * factor) / UNITS[unitIndex][0]) / factor;
  }

  return `${signString}${value}${UNITS[unitIndex][1]}`;
}
