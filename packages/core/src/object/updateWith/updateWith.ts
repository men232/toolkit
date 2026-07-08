import { isObject, isString } from '@/is';
import { isDeepKey, isIndex, toKey, toPath } from '@/str';
import { isUnsafeProperty } from '@/str/isUnsafeProperty';
import type { Arrayable } from '@/types';
import { get } from '../get';

/**
 * Updates the value at the specified path of the given object using an updater function and a customizer.
 * If any part of the path does not exist, it will be created.
 *
 * @template T - The type of the object.
 * @param object - The object to modify.
 * @param path - The path of the property to update.
 * @param updater - The function to produce the updated value.
 * @param customizer - The function to customize the update process.
 * @returns The modified object.
 *
 * @example
 * const object = { 'a': [{ 'b': { 'c': 3 } }] };
 * updateWith(object, 'a[0].b.c', (n) => n * n);
 * // => { 'a': [{ 'b': { 'c': 9 } }] }
 *
 * @group Object
 */
export function updateWith<T extends object>(
  object: T,
  path: Arrayable<PropertyKey>,
  updater: (oldValue: any) => any,
  customizer?: (value: any, key: string, object: T) => any,
): T;

/**
 * Updates the value at the specified path of the given object using an updater function and a customizer.
 * If any part of the path does not exist, it will be created.
 *
 * @template T - The type of the object.
 * @template R - The type of the return value.
 * @param object - The object to modify.
 * @param path - The path of the property to update.
 * @param updater - The function to produce the updated value.
 * @param customizer - The function to customize the update process.
 * @returns The modified object.
 *
 * @example
 * const object = { 'a': [{ 'b': { 'c': 3 } }] };
 * updateWith(object, 'a[0].b.c', (n) => n * n);
 * // => { 'a': [{ 'b': { 'c': 9 } }] }
 *
 * @group Object
 */
export function updateWith<T extends object, R>(
  object: T,
  path: Arrayable<PropertyKey>,
  updater: (oldValue: any) => any,
  customizer?: (value: any, key: string, object: T) => any,
): R;

/**
 * Updates the value at the specified path of the given object using an updater function and a customizer.
 * If any part of the path does not exist, it will be created.
 *
 * @template T - The type of the object.
 * @template R - The type of the return value.
 * @param obj - The object to modify.
 * @param path - The path of the property to update.
 * @param updater - The function to produce the updated value.
 * @param customizer - The function to customize the update process.
 * @returns The modified object.
 *
 * @example
 * const object = { 'a': [{ 'b': { 'c': 3 } }] };
 * updateWith(object, 'a[0].b.c', (n) => n * n);
 * // => { 'a': [{ 'b': { 'c': 9 } }] }
 *
 * @group Object
 */
export function updateWith<T extends object, R>(
  obj: T,
  path: Arrayable<PropertyKey>,
  updater: (value: any) => any,
  customizer?: (value: any, key: string, object: T) => any,
): T | R {
  if (obj == null && !isObject(obj)) {
    return obj;
  }

  let resolvedPath: PropertyKey[];
  if (
    isString(path) &&
    (!isDeepKey(path) || (obj != null && Object.hasOwn(obj, path)))
  ) {
    resolvedPath = [path];
  } else if (Array.isArray(path)) {
    resolvedPath = path;
  } else {
    resolvedPath = toPath(path);
  }

  const updateValue = updater(get(obj, resolvedPath));

  let current: any = obj;

  for (let i = 0; i < resolvedPath.length && current != null; i++) {
    const key = toKey(resolvedPath[i]);

    if (isUnsafeProperty(key)) {
      continue;
    }

    let newValue: unknown;

    if (i === resolvedPath.length - 1) {
      newValue = updateValue;
    } else {
      const objValue = current[key];
      const customizerResult = customizer?.(objValue, key as string, obj);
      newValue =
        customizerResult !== undefined
          ? customizerResult
          : objValue !== null &&
              (typeof objValue === 'object' || typeof objValue === 'function')
            ? objValue
            : isIndex(resolvedPath[i + 1])
              ? []
              : {};
    }

    assignValue(current, key, newValue);
    current = current[key];
  }

  return obj;
}

const assignValue = (object: any, key: PropertyKey, value: any): void => {
  const objValue = object[key];
  if (
    !(Object.hasOwn(object, key) && Object.is(objValue, value)) ||
    (value === undefined && !(key in object))
  ) {
    object[key] = value;
  }
};
