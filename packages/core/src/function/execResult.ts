import { isObject, isString } from '@/is';
import type {
  ExecResult,
  ExecResultToSkip,
  ExecResultToSuccess,
} from '../types';

/**
 * @group Utility Functions
 */
export function isSuccess<T>(
  value: T,
  // @ts-expect-error
): value is ExecResultToSuccess<T> {
  return (
    isObject(value) &&
    'success' in value &&
    'code' in value &&
    value.success === true &&
    isString(value.code) &&
    (!('reason' in value) || isString(value.reason))
  );
}

/**
 * @group Utility Functions
 */
export function isSkip<T>(
  value: T,
  // @ts-expect-error
): value is ExecResultToSkip<T> {
  return (
    isObject(value) &&
    'skip' in value &&
    'code' in value &&
    value.skip === true &&
    isString(value.code) &&
    (!('reason' in value) || isString(value.reason))
  );
}

/**
 * @group Utility Functions
 */
export function stringifyExecResult(value: ExecResult) {
  if (value.success) {
    return `ExecSuccess(code=${value.code}, reason="${value.reason || 'no reason'}")`;
  }

  return `ExecSkip(code=${value.code}, reason="${value.reason || 'no reason'}")`;
}
