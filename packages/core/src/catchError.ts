import { isPromise } from './is';
import { toError } from './toError';

export type CatchErrorResult<T> =
  T extends Promise<unknown>
    ? Promise<OkResult<Awaited<T>> | ErrorResult>
    : OkResult<T> | ErrorResult;

type ErrorResult = [Error, undefined];

type OkResult<T> = [undefined, T];

/**
 * You're tired to write `try... catch`, and so are we.
 *
 * Also supports `async/await`
 *
 * @example
 * const [err, result] = catchError(() => {
 *   // danger code
 * });
 *
 * @group Errors
 */
export function catchError<T>(fn: () => T): CatchErrorResult<T> {
  try {
    const res = fn();

    if (isPromise(res)) {
      return res.then(r => [undefined, r]).catch(onError) as any;
    }

    return [undefined, res] as any;
  } catch (err) {
    return onError(err) as any;
  }
}

function onError(error: unknown): ErrorResult {
  const err = toError(error);
  return [err, undefined];
}
