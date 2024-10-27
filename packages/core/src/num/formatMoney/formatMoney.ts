import { formatNumber } from '../formatNumber';
import { round2digits } from '../round2digits';

/**
 * Simple formatting money number
 *
 * @example
 * formatMoney(1500, 'USD'); // '1 500 USD'
 *
 * // when money represented by int
 * formatMoney(15000, 'USD', true); // '1 500 USD'
 *
 * @group Numbers
 */
export function formatMoney(
  amount: number,
  currencySymbol: string = 'USD',
  intMode = false,
): string {
  if (intMode) {
    amount = round2digits(amount / 100, 2);
  }

  return formatNumber(amount) + currencySymbol;
}
