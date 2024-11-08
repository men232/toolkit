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

  assert.ok(
    activeScope,
    'onScopeDispose() is called when there is no active scope to be associated with.' +
      captureStackTrace(onScopeDispose),
  );

  activeScope.cleanups.push(fn);
}
