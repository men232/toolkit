import type {
  ExecResult,
  ExecResultToSkip,
  ExecResultToSuccess,
} from './types';

/**
 * @group Utility Functions
 */
export function isSuccess<T extends ExecResult>(
  value: T,
  // @ts-expect-error
): value is ExecResultToSuccess<T> {
  return value.success === true;
}

/**
 * @group Utility Functions
 */
export function isSkip<T extends ExecResult>(
  value: T,
  // @ts-expect-error
): value is ExecResultToSkip<T> {
  return value.skip === true;
}
