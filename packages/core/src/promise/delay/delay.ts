import { defer } from '../defer';
import { fastIdle } from '../fastIdle';

/**
 * Returns a promise that resolves after the provided delay.
 *
 * If the delay is specified as `'tick'`, the promise resolves after the next event loop tick.
 *
 * If a numeric delay is provided, the promise resolves after the specified time in milliseconds.
 *
 * This is useful for introducing delays in asynchronous code, such as for throttling or rate-limiting,
 * or simply pausing execution between iterations.
 *
 * @param amount - The delay duration in milliseconds, or `'tick'` for a resolution after the next event loop tick.
 * @returns A promise that resolves after the specified delay.
 *
 * @example
 * let seconds = 0;
 *
 * // This will print numbers 1, 2, 3... every second
 * while (true) {
 *   await delay(1000);
 *   console.log(++seconds);
 * }
 *
 * @example
 * // This will wait until the next event loop tick before resolving
 * await delay('tick');
 *
 * @group Promise
 */
export function delay(amount: 'tick' | number = 'tick') {
  const d = defer<void>();

  if (amount === 'tick') {
    fastIdle(d.resolve);
  } else {
    setTimeout(d.resolve, amount);
  }

  return d.promise;
}
