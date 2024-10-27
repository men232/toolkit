import { isNumber, isString } from '@/is';
import { clamp } from '@/num/clamp';

/**
 * Parse alpha channel value and normalize it from 0 to 1
 *
 * @param value Value to be parsed
 * @param fallback Value which will be used as fallback when failed to parse
 *
 * @example
 * parseAlpha('0.1'); // 0.1
 * parseAlpha('10%'); // 0.1
 * parseAlpha(0.1); // 0.1
 *
 * @group Colors
 */
export function parseAlpha(value: unknown, fallback: number = 1): number {
  let a: unknown = value;

  if (isString(value)) {
    a = value.endsWith('%') ? parseFloat(value) / 100 : parseFloat(value);
  }

  if (!isNumber(a)) {
    a = fallback;
  }

  return clamp(a as number, 0, 1);
}
