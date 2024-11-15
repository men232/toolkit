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
  const unsignedNumberString = String(unsignedNumber);
  const numberLength = unsignedNumberString.length;
  const numberLengths = [13, 10, 7, 4];
  const bigNumPrefixes = ['T', 'B', 'M', 'k'];

  // small numbers
  if (unsignedNumber < 1000) {
    return `${signString}${unsignedNumberString}`;
  }

  // huge numbers
  if (numberLength > numberLengths[0] + 3) {
    return number.toExponential(decimals).replace('e+', 'x10^');
  }

  // 999 < unsignedNumber < 999,999,999,999,999
  let length = 0;
  for (let i = 0; i < numberLengths.length; i++) {
    const _length = numberLengths[i];
    if (numberLength >= _length) {
      length = _length;
      break;
    }
  }

  const decimalIndex = numberLength - length + 1;
  const unsignedNumberCharacterArray = unsignedNumberString.split('');

  const wholePartArray = unsignedNumberCharacterArray.slice(0, decimalIndex);
  const decimalPartArray = unsignedNumberCharacterArray.slice(
    decimalIndex,
    decimalIndex + decimals + 1,
  );

  const wholePart = wholePartArray.join('');

  // pad decimalPart if necessary
  let decimalPart = decimalPartArray.join('');
  if (decimalPart.length < decimals) {
    decimalPart += `${Array(decimals - decimalPart.length + 1).join('0')}`;
  }

  if (decimalPart[0] === '0') {
    decimals = 0;
  }

  let output;
  if (decimals === 0) {
    output = `${signString}${wholePart}${bigNumPrefixes[numberLengths.indexOf(length)]}`;
  } else {
    const outputNumber = Number(`${wholePart}.${decimalPart}`).toFixed(
      decimals,
    );
    output = `${signString}${outputNumber}${bigNumPrefixes[numberLengths.indexOf(length)]}`;
  }

  return output;
}
