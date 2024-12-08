import { getRandomInt } from '@/num/getRandomInt';
import type { TimeObject } from '@/types';

/**
 * Gets a random time within the specified range.
 *
 * Generates a random hour (`h`) and minute (`m`) between the given `startTime` and `endTime`.
 * If no range is provided, it defaults to the full day from `{ h: 0, m: 0 }` to `{ h: 23, m: 59 }`.
 *
 * @param {TimeObject} [startTime={ h: 0, m: 0 }] - The starting range for the random time.
 * @param {TimeObject} [endTime={ h: 23, m: 59 }] - The ending range for the random time.
 * @returns {TimeObject} - A random time object with `h` and `m` values within the given range.
 *
 * @example
 * // Generate a random time within the full day
 * const randomTime = getRandomTime();
 * console.log(randomTime); // e.g., { h: 12, m: 34 }
 *
 * @example
 * // Generate a random time between 9:00 and 17:00
 * const randomTime = getRandomTime({ h: 9, m: 0 }, { h: 17, m: 0 });
 * console.log(randomTime); // e.g., { h: 12, m: 15 }
 *
 * @example
 * // Generate a random time between 8:30 and 10:30
 * const randomTime = getRandomTime({ h: 8, m: 30 }, { h: 10, m: 30 });
 * console.log(randomTime); // e.g., { h: 9, m: 45 }
 *
 * @group Date
 */
export function getRandomTime(
  startTime: TimeObject = { h: 0, m: 0 },
  endTime: TimeObject = { h: 23, m: 59 },
): TimeObject {
  const h = getRandomInt(startTime.h, endTime.h);

  if (startTime.h === endTime.h) {
    return { h, m: getRandomInt(startTime.m, endTime.m) };
  }

  if (h === startTime.h) {
    return { h, m: getRandomInt(startTime.m, 59) };
  }

  if (h === endTime.h) {
    return { h, m: getRandomInt(0, endTime.m) };
  }

  return { h, m: getRandomInt(0, 59) };
}
