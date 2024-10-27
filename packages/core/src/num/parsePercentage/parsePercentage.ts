import { isNumber } from '@/is';
import { clamp } from '../clamp';

/**
 * Safe percent parsing. Returns value from 0 to 100
 *
 * @example
 * parsePercentage('99%'); // 99
 *
 * @group Numbers
 */
export function parsePercentage(value: unknown): number {
  const parsed = parseFloat(value as any);

  if (!isNumber(parsed)) return 0;

  return clamp(parsed, 0, 100);
}
