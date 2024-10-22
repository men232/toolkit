import { round2digits } from '../round2digits';

/**
 * Get percent of value
 */
export function percentOf(value: number, percent: number, digits?: number) {
  let result = (percent / 100) * value;

  if (digits) {
    result = round2digits(result, digits);
  }

  return result;
}
