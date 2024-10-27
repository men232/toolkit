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
 * Stack request animation frame into single execution callback.
 *
 * May result in an immediate execution if called from another RAF callback which was scheduled
 * (and therefore is executed) earlier than RAF callback scheduled by `fastRaf`
 *
 * @example
 * // will be called in same requestAnimationFrame
 * fastRaf(() => console.log(1));
 * fastRaf(() => console.log(2));
 *
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
