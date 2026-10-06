import { isDeepKey, toKey, toPath } from '@/str';
import { isUnsafeProperty } from '@/str/isUnsafeProperty';
import { isUnsafeToWriteProperty } from '@/str/isUnsafeToWriteProperty';
import type { Arrayable } from '@/types';

/**
 * Removes the property at the given path of the object.
 *
 * @param obj - The object to modify.
 * @param path - The path of the property to unset.
 * @returns Returns true if the property is deleted, else false.
 *
 * @example
 * const obj = { a: { b: { c: 42 } } };
 * unset(obj, 'a.b.c'); // true
 * console.log(obj); // { a: { b: {} } }
 *
 * @example
 * const obj = { a: { b: { c: 42 } } };
 * unset(obj, ['a', 'b', 'c']); // true
 * console.log(obj); // { a: { b: {} } }
 *
 * @group Object
 */
export function unset(obj: any, path: Arrayable<PropertyKey>): boolean {
  if (obj == null) {
    return true;
  }

  switch (typeof path) {
    case 'symbol':
    case 'number':
    case 'object': {
      if (Array.isArray(path)) {
        return unsetWithPath(obj, path);
      }

      if (typeof path === 'number') {
        path = toKey(path);
      } else if (typeof path === 'object') {
        if (Object.is((path as any)?.valueOf(), -0)) {
          path = '-0';
        } else {
          path = String(path);
        }
      }

      if (isUnsafeProperty(path as PropertyKey)) {
        return false;
      }

      if (obj?.[path as PropertyKey] === undefined) {
        return true;
      }

      try {
        delete obj[path as PropertyKey];
        return true;
      } catch {
        return false;
      }
    }
    case 'string': {
      if (
        obj?.[path] === undefined &&
        isDeepKey(path) &&
        !Object.hasOwn(obj, path)
      ) {
        return unsetWithPath(obj, toPath(path));
      }

      if (isUnsafeProperty(path)) {
        return false;
      }

      try {
        delete obj[path];
        return true;
      } catch {
        return false;
      }
    }
  }
}

function unsetWithPath(obj: any, path: readonly PropertyKey[]): boolean {
  const last = path.length - 1;
  const lastKey = path[last];
  let parent: any = obj;

  for (let i = 0; i < last; i++) {
    const key = path[i];

    if (isUnsafeToWriteProperty(key)) {
      return false;
    }

    const next = parent[key];

    if (next == null) {
      return true;
    }

    if (typeof next === 'function' && !Object.hasOwn(parent, key)) {
      return false;
    }

    parent = next;
  }

  if (parent[lastKey] === undefined) {
    return true;
  }

  if (isUnsafeProperty(lastKey)) {
    return false;
  }

  try {
    delete parent[lastKey];
    return true;
  } catch {
    return false;
  }
}
