import { isString } from '@/is';
import { type FormatNumber, formatNumber } from '../formatNumber';
import { round2digits } from '../round2digits';

export interface FormatMoney extends FormatNumber {
  symbol: string;
  symbolBefore?: boolean;
}

const CURRENCY_FORMAT = new Map<string, FormatMoney>([
  ['USD', { symbol: '$', thousands: ',', decimal: '.', symbolBefore: true }],
  ['EUR', { symbol: '€', thousands: '.', decimal: ',', symbolBefore: true }],
  ['GBP', { symbol: '£', thousands: ',', decimal: '.', symbolBefore: true }],
  ['JPY', { symbol: '¥', thousands: ',', decimal: '', symbolBefore: true }],
  ['AUD', { symbol: 'A$', thousands: ',', decimal: '.', symbolBefore: true }],
  ['CAD', { symbol: 'C$', thousands: ',', decimal: '.', symbolBefore: true }],
  ['CHF', { symbol: 'CHF', thousands: "'", decimal: '.', symbolBefore: true }],
  ['CNY', { symbol: '¥', thousands: ',', decimal: '.', symbolBefore: true }],
  ['INR', { symbol: '₹', thousands: ',', decimal: '.', symbolBefore: true }],
  ['KRW', { symbol: '₩', thousands: ',', decimal: '', symbolBefore: true }],
  ['RUB', { symbol: '₽', thousands: ' ', decimal: ',', symbolBefore: false }],
  ['UAH', { symbol: '₴', thousands: ' ', decimal: ',', symbolBefore: false }],
  ['BRL', { symbol: 'R$', thousands: '.', decimal: ',', symbolBefore: true }],
  ['MXN', { symbol: '$', thousands: ',', decimal: '.', symbolBefore: true }],
  ['ZAR', { symbol: 'R', thousands: ' ', decimal: ',', symbolBefore: true }],
  ['UAH', { symbol: '₴', thousands: ' ', decimal: ',', symbolBefore: true }],
]);

const DEF_FORMAT: FormatMoney = {
  decimal: ' ',
  thousands: ',',
  symbol: '',
  symbolBefore: false,
};

/**
 * Formats a given number (amount of money) as a currency string.
 * This function supports both integer and floating-point representations of money
 * and automatically applies the appropriate currency formatting for the specified currency code.
 *
 * @param {number} amount - The amount of money to format (in cents or as a floating-point value).
 * @param {string | FormatMoney} formatOrCode - The currency format or the currency code (e.g., 'USD').
 * If the format is passed as a string, the function will look up the format for that currency code.
 * @param {boolean} [intMode=false] - When set to `true`, the amount is considered to be in integer form (i.e., cents).
 * The value will be divided by 100 to convert it to a decimal format.
 *
 * @returns {string} The formatted money string, including the currency symbol and the properly formatted number.
 *
 * @example
 * // Basic formatting with USD currency
 * formatMoney(1500, 'USD');
 * // Returns: '$1,500'
 *
 * @example
 * // Formatting when the amount is in integer form (representing cents)
 * formatMoney(1599, 'USD', true);
 * // Returns: '$15.99'
 *
 * @group Numbers
 */
export function formatMoney(
  amount: number,
  formatOrCode: string | FormatMoney = 'USD',
  intMode = false,
): string {
  if (intMode) {
    amount = round2digits(amount / 100, 2);
  }

  const format = isString(formatOrCode)
    ? CURRENCY_FORMAT.get(formatOrCode) || {
        ...DEF_FORMAT,
        symbol: formatOrCode,
      }
    : formatOrCode;

  const formattedNumber = formatNumber(amount, format);

  return format.symbolBefore
    ? format.symbol + formattedNumber
    : formattedNumber + format.symbol;
}
