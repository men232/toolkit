import { catchError } from '@/catchError';
import { toError } from '@/toError';
import type { AnyFunction } from '@/types';

/**
 * A custom promise that supports cancellation.
 * Allows users to cancel the promise operation before it completes, avoiding unnecessary execution.
 * This class provides a mechanism to perform asynchronous tasks that can be stopped midway by calling the `cancel` method.
 *
 * @example
 * const task = new CancellablePromise<void>(async (resolve, reject, onCancel) => {
 *   let cancelled = false;
 *   onCancel(() => {
 *     cancelled = true;  // Define the cancellation logic here
 *   });
 *
 *   while (!cancelled) {
 *     await delay(1000);  // Simulate async work
 *     console.log('handling task...');
 *   }
 * });
 *
 * // Cancel the task after 5 seconds
 * setTimeout(() => task.cancel(), 5000);
 *
 * await task;  // This will be cancelled before it completes
 * console.log('Task completed or cancelled');
 *
 * @group Promise
 */
export class CancellablePromise<T> implements Promise<T> {
  #promise: Promise<T>;
  #cancelFns: (() => void)[];
  #isCancelled: boolean = false;
  #error: Error | null = null;

  constructor(
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void,
      onCancel: (cancelFn: () => void) => void,
    ) => void,
  ) {
    this.#cancelFns = [];
    this.#promise = new Promise<T>((resolve, reject) => {
      executor(
        resolve,
        reason => {
          this.#error = toError(reason, 'Unknown rejection reason.');
          reject(reason);
        },
        (fn: AnyFunction) => {
          this.#cancelFns.push(fn);
        },
      );
    });
  }

  get [Symbol.toStringTag](): string {
    return (
      this.#promise[Symbol.toStringTag] +
      (this.isCancelled ? ' (Cancelled)' : '')
    );
  }

  get isCancelled(): boolean {
    return this.#isCancelled;
  }

  get error(): Error | null {
    return this.#error;
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | Promise<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | Promise<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.#promise.then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | Promise<TResult>) | null,
  ): Promise<T | TResult> {
    return this.#promise.catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<T> {
    return this.#promise.finally(onfinally);
  }

  cancel(): void {
    if (this.#isCancelled) return;

    this.#isCancelled = true;

    for (const fn of this.#cancelFns) {
      catchError(fn);
    }
  }

  static from<T>(promise: Promise<T>): CancellablePromise<T> {
    return new CancellablePromise<T>((resolve, reject) => {
      promise.then(resolve).catch(reject);
    });
  }
}
