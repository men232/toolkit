import type { Primitive } from './types';

/**
 * Determines if the window object is available in the global scope
 *
 * @group Is
 */
export const isClient = typeof (globalThis as any)?.window !== 'undefined';

/**
 * Returns `true` when value is not `undefined`
 * @group Is
 */
export const isDef = <T = any>(val?: T): val is T => typeof val !== 'undefined';

const toString = Object.prototype.toString;

/**
 * Returns `true` when value is `null` or `undefined`
 * @group Is
 */
export function isNullOrUndefined(value: unknown): value is undefined | null {
  return value === null || value === undefined;
}

/**
 * Returns `true` when value is `BigInt`
 * @group Is
 */
export const isBigInt = (val: any): val is bigint => typeof val === 'bigint';

/**
 * Returns `true` when value is `Boolean`
 * @group Is
 */
export const isBoolean = (val: any): val is boolean => typeof val === 'boolean';

/**
 * Returns `true` when value is `Function`
 * @group Is
 */
export const isFunction = <T extends Function>(val: any): val is T =>
  typeof val === 'function';

/**
 * Returns `true` when value is `Number` and not `NaN`
 * @group Is
 */
export const isNumber = (val: any): val is number =>
  typeof val === 'number' && !isNaN(val);

/**
 * Returns `true` when value is `String`
 * @group Is
 */
export const isString = (val: unknown): val is string =>
  typeof val === 'string';

/**
 * Returns `true` when value is plain `Object`
 * @group Is
 */
export const isObject = (val: any): val is object =>
  toString.call(val) === '[object Object]';

/**
 * Returns `true` when value is valid `Date`
 * @group Is
 */
export const isDate = (val: any): val is Date =>
  val instanceof Date && !isNaN(val as any);

/**
 * Function that does nothing
 * @group Others
 */
export const noop = () => {};

/**
 * Returns true if values is `Error` or instance of `Error`
 * @group Is
 */
export const isError = (val: any): val is Error =>
  val instanceof Error ||
  //@ts-expect-error
  (isObject(val) && isString(val.message) && isString(val.stack));

/**
 * Returns true if values is `symbol`
 * @group Is
 */
export const isSymbol = (val: any): val is Symbol => typeof val == 'symbol';

/**
 * Checks if two values are equal, including support for `Date`, `RegExp`, and deep object comparison.
 *
 * @param {unknown} a - The first value to compare.
 * @param {unknown} b - The second value to compare.
 * @returns {boolean} `true` if the values are equal, otherwise `false`.
 *
 * @example
 * isEqual(1, 1); // true
 * isEqual({ a: 1 }, { a: 1 }); // true
 * isEqual(/abc/g, /abc/g); // true
 * isEqual(new Date('2020-01-01'), new Date('2020-01-01')); // true
 * isEqual([1, 2, 3], [1, 2, 3]); // true
 *
 * @group Is
 */
export function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (a instanceof RegExp && b instanceof RegExp) {
    return a.source === b.source && a.flags === b.flags;
  }

  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null
  ) {
    return false;
  }

  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  // check if all keys in both arrays match
  if (Array.from(new Set(aKeys.concat(bKeys))).length !== aKeys.length) {
    return false;
  }

  for (let i = 0; i < aKeys.length; i++) {
    const propKey = aKeys[i];
    const aProp = (a as any)[propKey];
    const bProp = (b as any)[propKey];

    if (!isEqual(aProp, bProp)) {
      return false;
    }
  }

  return true;
}

/**
 * Returns true if values is empty. Including support for `Array`, `Object`, `String` `Map`, `Set`.
 *
 * @group Is
 */
export const isEmpty = (obj: any): boolean => {
  if (obj === null || obj === undefined) return true;

  switch (obj?.constructor) {
    case Object: {
      for (const _ in obj) {
        return false;
      }

      return true;
    }

    case Array: {
      for (const _ in obj) {
        return false;
      }

      return true;
    }

    case String: {
      return !obj.length;
    }

    case Map: {
      return !obj.size;
    }

    case Set: {
      return !obj.size;
    }
  }

  return false;
};

/**
 * Returns `true` when value is `Promise`
 * @group Is
 */
export function isPromise<T = void>(value: any): value is Promise<T> {
  return (
    value &&
    typeof value === 'object' &&
    'then' in value &&
    'catch' in value &&
    typeof value.then === 'function' &&
    typeof value.catch === 'function'
  );
}

const primitiveTypeofSet = Object.freeze(
  new Set(['string', 'number', 'boolean', 'bigint', 'symbol', 'undefined']),
);

/**
 * Returns `true` when value is a primitive. `String`, `Number`, `Boolean`, `BigInt`, `Symbol`, `undefined`
 * @group Is
 */
export const isPrimitive = (value: unknown): value is Primitive => {
  return value === null || primitiveTypeofSet.has(typeof value);
};
