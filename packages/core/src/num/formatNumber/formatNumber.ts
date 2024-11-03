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
 * Simple formatting money number
 *
 * @example
 * formatNumber(1500); // '1 500'
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
