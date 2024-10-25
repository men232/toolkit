import { isObject } from '@/is';

/**
 * Returns true when provided keys exists in target object
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
