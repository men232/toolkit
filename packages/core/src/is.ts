import type { Primitive } from './types';

/**
 * Determines if the window object is available in the global scope
 *
 * @group Predicates
 */
export const isClient = typeof (globalThis as any)?.window !== 'undefined';

/**
 * Returns `true` when value is not `undefined`
 * @group Predicates
 */
export const isDef = <T = any>(val?: T): val is T => typeof val !== 'undefined';

const toString = Object.prototype.toString;

/**
 * Checks if the given value is a `null` or `undefined`
 * @group Predicates
 */
export function isNullOrUndefined(value: unknown): value is undefined | null {
  return value === null || value === undefined;
}

/**
 * Checks if the given value is a `bigint`
 * @group Predicates
 */
export const isBigInt = (val: any): val is bigint => typeof val === 'bigint';

/**
 * Checks if the given value is a `boolean`
 * @group Predicates
 */
export const isBoolean = (val: any): val is boolean => typeof val === 'boolean';

/**
 * Checks if the given value is a `function`
 * @group Predicates
 */
export const isFunction = <T extends Function>(val: any): val is T =>
  typeof val === 'function';

/**
 * Checks if the given value is a `number`
 *
 * @example
 * console.log(isNumber(123)); // true
 * console.log(isNumber('abc')); // false
 * console.log(isNumber(NaN)); // false
 *
 * @group Predicates
 */
export const isNumber = (val: any): val is number =>
  typeof val === 'number' && !isNaN(val);

/**
 * Checks if the given value is a `string`
 * @group Predicates
 */
export const isString = (val: unknown): val is string =>
  typeof val === 'string';

/**
 * Checks if the given value is a plain `object`
 * @group Predicates
 */
export const isObject = (val: any): val is object =>
  toString.call(val) === '[object Object]';

/**
 * Checks if the given value is valid `Date`
 * @group Predicates
 */
export const isDate = (val: any): val is Date =>
  val instanceof Date && !isNaN(val as any);

/**
 * Function that does nothing
 * @group Utility Functions
 */
export const noop = () => {};

/**
 * Checks if the given value is a `Error`
 * @group Predicates
 */
export const isError = (val: any): val is Error =>
  val instanceof Error ||
  //@ts-expect-error
  (isObject(val) && isString(val.message) && isString(val.stack));

/**
 * Checks if the given value is a `symbol`
 * @group Predicates
 */
export const isSymbol = (val: any): val is Symbol => typeof val == 'symbol';

/**
 * Checks if the given value is a `Set`.
 * @group Predicates
 */
export const isSet = <T = any>(val: any): val is Set<T> => val instanceof Set;

/**
 * Checks if the given value is a `WeekSet`.
 * @group Predicates
 */
export const isWeakSet = <T extends WeakKey = any>(
  val: any,
): val is WeakSet<T> => val instanceof WeakSet;

/**
 * Checks if the given value is a `Map`.
 * @group Predicates
 */
export const isMap = <K = any, V = any>(val: any): val is Map<K, V> =>
  val instanceof Map;

/**
 * Checks if the given value is a `WeakMap`.
 * @group Predicates
 */
export const isWeakMap = <V = any>(val: any): val is WeakMap<WeakKey, V> =>
  val instanceof WeakMap;

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
 * @group Predicates
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
 * Checks if a given value is empty.
 *
 * Support for `Array`, `Object`, `string` `Map`, `Set`.
 *
 * @example
 * isEmpty(); // true
 * isEmpty(null); // true
 * isEmpty(''); // true
 * isEmpty([]); // true
 * isEmpty({}); // true
 * isEmpty(new Map()); // true
 * isEmpty(new Set()); // true
 * isEmpty('hello'); // false
 * isEmpty([1, 2, 3]); // false
 * isEmpty({ a: 1 }); // false
 * isEmpty(new Map([['key', 'value']])); // false
 * isEmpty(new Set([1, 2, 3])); // false
 *
 * @group Predicates
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
 * Checks if the given value is a `Promise`
 * @group Predicates
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
 * Checks whether a value is a JavaScript primitive.
 *
 * JavaScript primitives include null, undefined, strings, numbers, booleans, symbols, and bigints.
 * @group Predicates
 */
export const isPrimitive = (value: unknown): value is Primitive => {
  return value === null || primitiveTypeofSet.has(typeof value);
};
