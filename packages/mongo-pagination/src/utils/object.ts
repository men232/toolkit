import { isEmpty, isFunction, isObject } from '@andrew_l/toolkit';

export function isEmptyObject(obj: unknown): boolean {
  return !isObject(obj) || isEmpty(obj);
}

/**
 * Returns keys that existed in all provided objects.
 */
export function sameKeys(...args: object[]): string[] {
  const map: Record<string, number> = {};

  for (let obj of args) {
    const keys = Object.keys(obj);

    for (let key of keys) {
      if (!map[key]) map[key] = 0;
      map[key]++;
    }
  }

  return Object.keys(map).filter(key => map[key] > 1);
}

export function defineGetter(obj: object, key: string, getterFn: () => any) {
  // @ts-expect-error
  delete obj[key];

  Object.defineProperty(obj, key, {
    get: getterFn,
    enumerable: true,
    configurable: true,
  });
}

export function isLastKeys(
  value: unknown,
  keys: string[],
  strictOrder?: boolean,
) {
  const objKeys = isObject(value) ? Object.keys(value) : [];

  const lastKeys = objKeys.slice(-keys.length);

  if (lastKeys.length !== keys.length) {
    return false;
  }

  for (let idx = 0; idx < keys.length; idx++) {
    if (strictOrder) {
      if (lastKeys[idx] !== keys[idx]) {
        return false;
      }
    } else {
      if (!lastKeys.includes(keys[idx])) {
        return false;
      }
    }
  }

  return true;
}

export function toObject(value: any): any {
  return isFunction(value?.toObject) ? value?.toObject() : value;
}
