import { isNumber, isString } from '@/is';

export interface FormatNumber {
  thousands: string;
  decimal: string;
}

const defaultFormat: FormatNumber = {
  /**
   * Symbol to separate thousands parts
   */
  thousands: ',',

  /**
   * Symbol to separate decimal part
   */
  decimal: '.',
};

const regExp = /\B(?=(\d{3})+(?!\d))/g;

/**
 * Formats a number (or string representing a number) into a string with thousands separators and optional decimal points.
 * The function supports customizing the formatting style using the `FormatNumber` object.
 *
 * @param {number | string} value - The number or string to format.
 * If a string is passed, it is parsed to a number before formatting.
 * @param {FormatNumber} [format=defaultFormat] - The format settings for thousands and decimal separators.
 * By default, it uses the `{ thousands: ',', decimal: '.' }`.
 *
 * @returns {string} The formatted number string with appropriate thousands separators and decimal formatting.
 *
 * @example
 * // Format a number with default thousands separator
 * formatNumber(1500);
 * // Returns: '1,500'
 *
 * @example
 * // Format a number with a custom format (e.g., using a comma as the thousands separator)
 * formatNumber(1500.75, { thousands: ' ', decimal: '.' });
 * // Returns: '1 500.75'
 *
 * @group Numbers
 */
export function formatNumber(
  value: number | string,
  format: FormatNumber = defaultFormat,
): string {
  if (isString(value)) {
    return formatNumber(parseFloat(value), format);
  }

  if (!isNumber(value)) return '';

  const [integerPart, decimalPart] = value.toFixed(2).split('.');

  let result = String(integerPart).replace(regExp, format.thousands);

  if (decimalPart !== '00') {
    result += format.decimal + decimalPart;
  }

  return result;
}
