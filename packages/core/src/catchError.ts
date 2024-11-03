import { isPromise } from './is';
import { toError } from './toError';

type ToCatchResult<T> =
  T extends Promise<any>
    ? Promise<CatchSuccessResult<Awaited<T>> | CatchErrorResult>
    : CatchSuccessResult<T> | CatchErrorResult;

type CatchErrorResult = [Error, undefined];

type CatchSuccessResult<T> = [undefined, T];

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
export function catchError<T>(fn: () => T): ToCatchResult<T> {
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

function onError(error: unknown): CatchErrorResult {
  const err = toError(error);
  return [err, undefined];
}
