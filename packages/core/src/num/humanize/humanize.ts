/**
 * Humanize a big number like 100K 1.2M
 *
 * @example
 * console.log(humanize(1000000)); // '1M'
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
