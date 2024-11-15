import { isNumber } from '@/is';
import { clamp } from '../clamp';

/**
 * Safely parses a percentage value and returns a number between 0 and 100.
 * It accepts both string and numeric input, automatically handling the '%' sign if present.
 * If the value is not a valid percentage, it returns 0.
 *
 * @param {unknown} value - The value to parse, which can be a string (e.g., '99%') or a number (e.g., 45).
 * @returns {number} A parsed percentage value, constrained between 0 and 100.
 * If the input is invalid or cannot be parsed, it returns 0.
 *
 * @example
 * parsePercentage('99%');
 * // Returns: 99
 *
 * @example
 * parsePercentage('150%');
 * // Returns: 100 (clamped to the maximum allowed value)
 *
 * @example
 * parsePercentage('50.5%');
 * // Returns: 50.5
 *
 * @example
 * parsePercentage('abc');
 * // Returns: 0 (invalid input)
 *
 * @example
 * parsePercentage(80);
 * // Returns: 80 (valid number input)
 *
 * @group Numbers
 */
export function parsePercentage(value: unknown): number {
  const parsed = parseFloat(value as any);

  if (!isNumber(parsed)) return 0;

  return clamp(parsed, 0, 100);
}
