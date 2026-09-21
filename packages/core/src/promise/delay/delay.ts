import { fastIdle } from '../fastIdle';

interface DelayOptions {
  signal?: AbortSignal;
}

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
 * @param options.signal - Resolves the promise early when aborted.
 * @returns A promise that resolves after the specified delay, or as soon as the signal aborts.
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
 * @example
 * // This will stop waiting as soon as the signal aborts
 * await delay(30_000, { signal: controller.signal });
 *
 * @group Promise
 */
export function delay(
  amount: 'tick' | number = 'tick',
  { signal }: DelayOptions = {},
): Promise<void> {
  return new Promise<void>(resolve => {
    if (signal?.aborted) {
      return resolve();
    }

    var settled = false;
    var timeoutId: ReturnType<typeof setTimeout> | undefined;

    var settle = () => {
      // fastIdle cannot be cancelled, so a late callback is absorbed here
      if (settled) return;

      settled = true;
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', settle);
      resolve();
    };

    if (amount === 'tick') {
      fastIdle(settle);
    } else {
      timeoutId = setTimeout(settle, amount);
    }

    signal?.addEventListener('abort', settle, { once: true });
  });
}
