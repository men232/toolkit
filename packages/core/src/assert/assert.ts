/* eslint-env node */
import {
  isBoolean,
  isDate,
  isEmpty,
  isError,
  isFunction,
  isNumber,
  isObject,
  isString,
} from '../is';

import { AssertionError } from './AssertionError.js';

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

export function notEmpty(
  value: unknown,
  message?: string | Error,
): asserts value {
  if (!isEmpty(value)) {
    throw toError(notEmpty, value, message, 'Expected not empty value.');
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

export function date(
  value: unknown,
  message?: string | Error,
): asserts value is Date {
  if (!isDate(value)) {
    throw toError(date, value, message, 'Expected date value.');
  }
}

export function fn(
  value: unknown,
  message?: string | Error,
): asserts value is Function {
  if (!isFunction(value)) {
    throw toError(fn, value, message, 'Expected function value.');
  }
}

export function greaterThan(
  value: unknown,
  target: number,
  message?: string | Error,
): asserts value is number {
  if (!isNumber(value) || value < target) {
    throw toError(
      greaterThan,
      value,
      message,
      'Expected number value greater then ' + target + '.',
    );
  }
}

export function lessThan(
  value: unknown,
  target: number,
  message?: string | Error,
): asserts value is number {
  if (!isNumber(value) || value > target) {
    throw toError(
      lessThan,
      value,
      message,
      'Expected number value less then ' + target + '.',
    );
  }
}

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
