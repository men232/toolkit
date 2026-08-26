import { assert, captureStackTrace } from '@andrew_l/toolkit';
import { getCurrentScope } from '../scope';

/**
 * The callback will be invoked when the associated context completes.
 *
 * @example
 * const fn = withContext(() => {
 *   onScopeDispose(() => {
 *     console.log(2);
 *   });
 *
 *   console.log(1);
 * });
 *
 * fn();
 *
 * console.log(3);
 *
 * // 1
 * // 2
 * // 3
 *
 * @group Main
 */
export function onScopeDispose(fn: () => void) {
  const activeScope = getCurrentScope();

  // Build the message (with its expensive stack capture) only on failure —
  // this runs on hot paths where the assert virtually always passes.
  if (!activeScope) {
    assert.ok(
      false,
      'onScopeDispose() is called when there is no active scope to be associated with.' +
        captureStackTrace(onScopeDispose),
    );
  }

  activeScope.cleanups.push(fn);
}
