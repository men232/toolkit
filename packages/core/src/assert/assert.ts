/* eslint-env node */
import { isBoolean, isError, isNumber, isObject, isString } from '../is';

let AssertionError: any;

(async () => {
  AssertionError = (globalThis as any).window
    ? await import('../errors/BrowserAssertionError').then(
        r => r.BrowserAssertionError,
      )
    : await import('node:assert').then(r => r.AssertionError);
})();

export function ok(value: unknown, message?: string | Error): asserts value {
  if (!value) {
    throw toError(
      ok,
      value,
      message,
      'The expression evaluated to a falsy value.',
    );
  }
}

export function equal<T>(
  actual: unknown,
  expected: T,
  message?: string | Error,
): asserts actual is T {
  if (actual !== expected) {
    new AssertionError({
      actual,
      expected,
      message: isString(message)
        ? message
        : 'The actual value not as expected.',
      operator: 'equal',
      stackStartFn: equal,
    });
  }
}

export function object(
  value: unknown,
  message?: string | Error,
): asserts value is object {
  if (!isObject(value)) {
    throw toError(object, value, message, 'Expected object value.');
  }
}

export function string(
  value: unknown,
  message?: string | Error,
): asserts value is string {
  if (!isString(value)) {
    throw toError(string, value, message, 'Expected string value.');
  }
}

export function boolean(
  value: unknown,
  message?: string | Error,
): asserts value is boolean {
  if (!isBoolean(value)) {
    throw toError(boolean, value, message, 'Expected boolean value.');
  }
}

export function notEmptyString(
  value: unknown,
  message?: string | Error,
): asserts value is string {
  if (!isString(value) || !(value as any).trim()) {
    throw toError(
      notEmptyString,
      value,
      message,
      'Expected not empty string value.',
    );
  }
}

export function number(
  value: unknown,
  message?: string | Error,
): asserts value is number {
  if (!isNumber(value)) {
    throw toError(number, value, message, 'Expected number value.');
  }
}

/**
 * @param {unknown} value
 * @param {string | Error} [message]
 * @return {asserts value is Array}
 */
export function array(
  value: unknown,
  message?: string | Error,
): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw toError(array, value, message, 'Expected array value.');
  }
}

export function arrayStrings(
  value: unknown,
  message?: string | Error,
): asserts value is string[] {
  if (!Array.isArray(value) || !value.every(isString)) {
    throw toError(arrayStrings, value, message, 'Expected strings list value.');
  }
}

export function arrayNumbers(
  value: unknown,
  message?: string | Error,
): asserts value is number[] {
  if (!Array.isArray(value) || !value.every(isNumber)) {
    throw toError(arrayNumbers, value, message, 'Expected numbers list value.');
  }
}

/**
 * Transform value to error object
 */
function toError(
  operator: Function,
  actual: unknown,
  message?: string | Error,
  unknownMessage: string = 'Unknown error',
): Error {
  if (isError(message)) {
    return message as any;
  }

  return new AssertionError({
    actual,
    message: isString(message) ? message : unknownMessage,
    operator: operator.name,
    stackStartFn: operator,
  });
}
