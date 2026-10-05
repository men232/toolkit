/**
 * Determines the number of ISO weeks in a given year.
 *
 * The ISO week numbering system defines a year as having 52 or 53 full weeks.
 *
 * @param {number} year - The year for which to calculate the number of ISO weeks.
 * @returns {number} - Returns 52 or 53 based on the ISO 8601 standard.
 *
 * @example
 * // Common year with 52 weeks
 * weeksInYear(2023); // 52
 *
 * @example
 * // January 1 is a Wednesday in a leap year, so the year has 53 weeks
 * weeksInYear(2020); // 53
 *
 * @group Date
 */
export function weeksInYear(year: number): number {
  return dec31Weekday(year) === 4 || dec31Weekday(year - 1) === 3 ? 53 : 52;
}

const dec31Weekday = (year: number): number =>
  (year +
    Math.floor(year / 4) -
    Math.floor(year / 100) +
    Math.floor(year / 400)) %
  7;
