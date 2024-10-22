import type {
  ExecResult,
  ExecResultToSkip,
  ExecResultToSuccess,
} from './types';

export function isSuccess<T extends ExecResult>(
  value: T,
  // @ts-expect-error
): value is ExecResultToSuccess<T> {
  return value.success === true;
}

export function isSkip<T extends ExecResult>(
  value: T,
  // @ts-expect-error
): value is ExecResultToSkip<T> {
  return value.skip === true;
}
