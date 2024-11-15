import type { AnyFunction } from '@/types';

type NoneToVoidFunction = () => void;

const FAST_RAF_TIMEOUT_FALLBACK_MS = 300;

const defaultWindow = (globalThis as any)?.window;
const raf =
  defaultWindow?.requestAnimationFrame ||
  ((cb: AnyFunction) => setTimeout(cb, 0));

let fastRafCallbacks: Set<NoneToVoidFunction> | undefined;
let fastRafFallbackCallbacks: Set<NoneToVoidFunction> | undefined;
let fastRafFallbackTimeout: any;

/**
 * Stacks callbacks for `requestAnimationFrame` into a single execution call.
 *
 * This function allows multiple `fastRaf` calls to be batched into a single animation frame callback.
 * The callbacks are executed in the same frame, one after the other. Additionally, if `withTimeoutFallback` is true,
 * the callbacks will be executed after a fallback timeout if `requestAnimationFrame` is not available.
 * If called from within another RAF callback, the execution might be immediate.
 *
 * @example
 * // Callbacks will be executed in the same `requestAnimationFrame` cycle
 * fastRaf(() => console.log(1));
 * fastRaf(() => console.log(2));
 *
 * // Output:
 * // 1
 * // 2
 *
 * @param callback The callback function to be executed in the next `requestAnimationFrame`.
 * @param [withTimeoutFallback=false] Optional flag to execute callbacks after a fallback timeout if `requestAnimationFrame` is not available.
 * @group Promise
 */
export function fastRaf(
  callback: NoneToVoidFunction,
  withTimeoutFallback = false,
) {
  if (!fastRafCallbacks) {
    fastRafCallbacks = new Set([callback]);

    raf(() => {
      const currentCallbacks = fastRafCallbacks!;

      fastRafCallbacks = undefined;
      fastRafFallbackCallbacks = undefined;

      if (fastRafFallbackTimeout) {
        clearTimeout(fastRafFallbackTimeout);
        fastRafFallbackTimeout = undefined;
      }

      currentCallbacks.forEach(cb => cb());
    });
  } else {
    fastRafCallbacks.add(callback);
  }

  if (withTimeoutFallback) {
    if (!fastRafFallbackCallbacks) {
      fastRafFallbackCallbacks = new Set([callback]);
    } else {
      fastRafFallbackCallbacks.add(callback);
    }

    if (!fastRafFallbackTimeout) {
      fastRafFallbackTimeout = setTimeout(() => {
        const currentTimeoutCallbacks = fastRafFallbackCallbacks!;

        if (fastRafCallbacks) {
          currentTimeoutCallbacks.forEach(
            fastRafCallbacks.delete,
            fastRafCallbacks,
          );
        }
        fastRafFallbackCallbacks = undefined;

        if (fastRafFallbackTimeout) {
          clearTimeout(fastRafFallbackTimeout);
          fastRafFallbackTimeout = undefined;
        }

        currentTimeoutCallbacks.forEach(cb => cb());
      }, FAST_RAF_TIMEOUT_FALLBACK_MS);
    }
  }
}

export function rafPromise() {
  return new Promise<void>(resolve => {
    fastRaf(resolve);
  });
}
