import { isNumber } from '@/is';

/**
 * Creates a date from seconds since the Unix epoch.
 *
 * ⚠️ Returns `null` when invalid number passed.
 *
 * @group Numbers
 */
export function timestampToDate(value: number): Date | null {
  if (!isNumber(value)) return null;
  return new Date(value * 1000);
}
