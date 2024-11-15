export interface Defer<T = unknown> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (value: any) => void;
}

/**
 * Old known defer :)
 *
 * @example
 * function loadModule() {
 *   const q = defer<void>();
 *
 *   setTimeout(() => q.resolve(), 5000);
 *
 *   return q.promise;
 * }
 *
 * await loadModule();
 *
 * @group Promise
 */
export function defer<T = void>(): Defer<T> {
  let resolve: any;
  let reject: any;

  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return {
    resolve: resolve,
    reject: reject,
    promise: promise,
  };
}
