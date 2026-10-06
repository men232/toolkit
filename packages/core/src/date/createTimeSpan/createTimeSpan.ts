import { TimeSpan, type TimeSpanUnit } from './TimeSpan';

/**
 * Creates a new instance of `TimeSpan`.
 *
 * This utility function allows you to create a `TimeSpan` object by providing a numeric value and a unit of time.
 * The default unit is `'ms'` (milliseconds).
 *
 * @param {number} value - The numeric value representing the timespan.
 * @param {TimeSpanUnit} [unit='ms'] - The unit of time for the timespan value. Options are `'ms'`, `'s'`, `'m'`, `'h'`, `'d'`, `'w'`.
 * @returns {TimeSpan} An instance of the `TimeSpan` class.
 * @example
 * // Create a TimeSpan with 500 milliseconds
 * const ts = createTimeSpan(500);
 * console.log(ts.milliseconds()); // 500
 *
 * @example
 * // Create a TimeSpan with 2 hours
 * const ts = createTimeSpan(2, 'h');
 * console.log(ts.seconds()); // 120
 *
 * @example
 * // Create a TimeSpan with 7 days
 * const ts = createTimeSpan(7, 'd');
 * console.log(ts.weeks()); // 1
 *
 * @replaces `const DAY_MS = 24 * 60 * 60 * 1000` and similar unit constants — `createTimeSpan(1, 'd').milliseconds()`
 * names the unit and converts between ms, s, m, h, d and w. Units have fixed lengths (a day is always 24h).
 * @detect `(const|let|var)\s+\w+\s*=\s*([\d_]+\s*\*\s*)*60\s*\*\s*60\s*\*\s*1000\b`
 * @detect `(const|let|var)\s+\w+\s*=\s*(1000\s*\*\s*60\s*\*\s*60(\s*\*\s*\d+)*|86_?400_?000|864e5)\b`
 *
 * @group Date
 */
export function createTimeSpan(
  value: number,
  unit: TimeSpanUnit = 'ms',
): TimeSpan {
  return new TimeSpan(value, unit);
}
