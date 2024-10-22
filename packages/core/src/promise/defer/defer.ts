export interface Defer<T = unknown> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (value: any) => void;
}

export function defer<T>(): Defer<T> {
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
