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
 * Pretty simple money formatting function
 *
 * @example
 * formatMoney(1500, 'USD'); // '$1,500'
 *
 * // when money represented by int
 * formatMoney(1599, 'USD', true); // '$15.99'
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
