import type { AnyFunction } from './types';

/**
 * Capture stack trace till the function and returns as a `string`
 *
 * @example
 *
 * function main() {
 *   const userId = getUserId();
 * }
 *
 * function getUserId() {
 *   const stackTrace = captureStackTrace(doCoolStuff);
 *   console.warn('Please, use getAccountId instead.', stackTrace);
 * }
 *
 * @group Errors
 */
export function captureStackTrace(till: AnyFunction): string {
  const err = new Error('');

  if ('captureStackTrace' in Error) {
    (Error.captureStackTrace as any)(err, till);
  }

  return (err.stack || '').slice(6);
}
