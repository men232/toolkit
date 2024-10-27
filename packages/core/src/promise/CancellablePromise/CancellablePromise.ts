/**
 * Same as promise but with cantabile feature
 *
 * @example
 * const task = new CancellablePromise<void>(async (resolve, reject, onCancel) => {
 *   let cancelled = false;
 *   onCancel(() => {
 *     cancelled = true;
 *   });
 *
 *   while (!cancelled) {
 *     await delay(1000);
 *     console.log('handle');
 *   }
 * });
 *
 * setTimeout(() => task.cancel(), 5000);
 *
 * await task;
 * console.log('complete');
 *
 * @group Promise
 */
export class CancellablePromise<T> implements Promise<T> {
  #promise: Promise<T>;
  #cancelFn: () => void;
  #isCancelled: boolean = false;
  #error: Error | null = null;

  constructor(
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void,
      onCancel: (cancelFn: () => void) => void,
    ) => void,
  ) {
    let cancel: () => void;

    this.#promise = new Promise<T>((resolve, reject) => {
      executor(
        resolve,
        reason => {
          this.#error =
            reason instanceof Error ? reason : new Error(String(reason));
          reject(reason);
        },
        cancelFn => {
          cancel = () => {
            this.#isCancelled = true;
            cancelFn();
          };
        },
      );
    });

    this.#cancelFn = cancel!;
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
    this.#cancelFn();
  }

  static from<T>(promise: Promise<T>): CancellablePromise<T> {
    return new CancellablePromise<T>((resolve, reject) => {
      promise.then(resolve).catch(reject);
    });
  }
}
