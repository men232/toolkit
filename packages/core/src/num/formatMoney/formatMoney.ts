import { formatNumber } from '../formatNumber';
import { round2digits } from '../round2digits';

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
