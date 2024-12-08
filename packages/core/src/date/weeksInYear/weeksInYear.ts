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
 * // Leap year with 53 weeks
 * weeksInYear(2020); // 53
 *
 * @group Date
 */
export function weeksInYear(year: number): number {
  const target = new Date(Date.UTC(year + 1, 0, 1));
  const dayNumber = target.getDay();

  return dayNumber < 4 ? 52 : 53;
}
