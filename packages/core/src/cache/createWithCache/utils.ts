import { isObject } from '@/is';
import { randomString } from '@/str/randomString';

const objectKeys = new WeakMap<object, string>();

const BSON_TYPES = Object.freeze(new Set(['ObjectID', 'ObjectId']));

export const SYM_WITH_CACHE = Symbol();

export interface ArgToKeyOptions {
  /**
   * Object key generation strategy.
   *
   * When `json` we will use `JSON.stringify` which not quite effective.
   * Also may not hit into cache when object has different key order.
   *
   * When `ref` we will use WeakMap to store object key which more effective but may produce unexpected cache hit.
   *
   * @default `ref`
   */
  objectStrategy: 'json' | 'ref';
}

export const argToKey = /*#__PURE__*/ (
  value: unknown,
  options: Partial<ArgToKeyOptions> = { objectStrategy: 'ref' },
): string => {
  let result = '';

  if (isObject(value)) {
    // edge case for mongoose objects
    if (BSON_TYPES.has((value as any)?._bsontype)) {
      return String(value);
    }

    let key: string;

    if (options.objectStrategy === 'json') {
      key = JSON.stringify(value);
    } else {
      key = objectKeys.get(value)!;

      if (!key) {
        key = createRadomKey();
        objectKeys.set(value, key);
      }
    }

    return key;
  } else if (Array.isArray(value)) {
    result += value.map(v => argToKey(v, options)).join('/');
  } else {
    result = String(value);
  }

  return result;
};

function createRadomKey() {
  return Date.now() + '_' + randomString(16);
}
