import type { TimeValue } from '@/types';
import { createTimeObject } from '../createTimeObject';

/**
 * Converts a time value into the total number of minutes.
 *
 * @param {TimeValue} value - A time value
 *
 * @returns {number} The total number of minutes represented by the time value.
 *
 * @example
 * // Assuming createTimeObject("2:30") returns { h: 2, m: 30 }
 * timeToMinutes("2:30"); // 150
 *
 * // Assuming createTimeObject({ h: 1, m: 45 }) returns { h: 1, m: 45 }
 * timeToMinutes({ h: 1, m: 45 }); // 105
 *
 * @group Date
 */
export function timeToMinutes(value: TimeValue): number {
  const time = createTimeObject(value);
  return time.h * 60 + time.m;
}
