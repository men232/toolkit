/**
 * Computes the average of circular values using vector summation.
 *
 * This function calculates the circular mean of an array of values,
 * which is useful for cyclic data (e.g., time of day, angles).
 *
 * @param {readonly number[]} values - The array of numbers representing circular values.
 * @param {number} max - The maximum possible value in the cycle (e.g., 24 for hours, 360 for degrees).
 * @returns {number} - The computed circular mean, wrapped within the range [0, max).
 *
 * @example
 * // Averaging angles in degrees
 * avgCircular([350, 10, 20], 360); // Returns approximately 0
 *
 * @example
 * // Averaging times in hours (on a 24-hour clock)
 * avgCircular([23, 1, 2], 24); // Returns approximately 0
 *
 * @group Array
 */
export const avgCircular = (values: readonly number[], max: number) => {
  const len = values.length;

  if (!len) return 0;

  let sumX = 0;
  let sumY = 0;
  let angle: number;
  let value: number;

  for (value of values) {
    angle = (value / max) * 2 * Math.PI;
    sumX += Math.cos(angle);
    sumY += Math.sin(angle);
  }

  angle = Math.atan2(sumY / len, sumX / len);

  return ((angle / (2 * Math.PI)) * max + max) % max;
};
