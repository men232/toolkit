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
 * @group Date
 */
export function createTimeSpan(
  value: number,
  unit: TimeSpanUnit = 'ms',
): TimeSpan {
  return new TimeSpan(value, unit);
}
