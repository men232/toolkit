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

  // Drop the header line whatever it is: tools that override
  // `Error.prepareStackTrace` (vitest, source-map-support) emit `Error: ` instead of `Error`
  const stack = err.stack || '';
  const firstFrame = stack.indexOf('\n');

  return firstFrame === -1 ? '' : stack.slice(firstFrame + 1);
}
