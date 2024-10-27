import { isObject } from '@/is';

/**
 * Returns true when provided keys exists in target object
 *
 * @example
 * const user = { id: 1, name: 'Andrew' };
 *
 * has(user, ['roles']); // false
 * has(user, ['roles', 'name']); // false
 * has(user, ['name']); // true
 *
 * @group Object
 */
export function has<T extends PropertyKey>(
  value: any,
  keys: T[],
): value is { [K in T]: any } {
  if (!isObject(value)) return false;

  for (let idx = 0; idx < keys.length; idx++) {
    const element = keys[idx];

    if (!(element in value)) return false;
  }

  return true;
}
