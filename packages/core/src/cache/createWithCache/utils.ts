import { EJSON } from '@/ejson';
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
      key = EJSON.stringify(value);
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

export const argsToKey = /*#__PURE__*/ (
  args: readonly unknown[],
  options: Partial<ArgToKeyOptions> = { objectStrategy: 'ref' },
): string => {
  let key = '';

  for (let i = 0; i < args.length; i++) {
    key += typedKey(args[i], options);
  }

  return key;
};

const typedKey = (
  value: unknown,
  options: Partial<ArgToKeyOptions>,
): string => {
  switch (typeof value) {
    case 'string':
      return sized('s', value);
    case 'number':
      return 'n' + value + ';';
    case 'bigint':
      return 'b' + value + ';';
    case 'boolean':
      return value ? 't' : 'f';
    case 'undefined':
      return 'u';
    case 'symbol':
      return sized('y', String(value));
    case 'function':
      return sized('r', refKey(value));
  }

  if (value === null) return 'N';

  if (Array.isArray(value)) {
    let key = 'a' + value.length + ':';

    for (let i = 0; i < value.length; i++) {
      key += typedKey(value[i], options);
    }

    return key;
  }

  if (value instanceof Date) return 'd' + value.getTime() + ';';

  if (BSON_TYPES.has((value as any)._bsontype)) {
    return sized('s', String(value));
  }

  if (options.objectStrategy === 'json') {
    return sized('j', EJSON.stringify(value));
  }

  return sized('r', refKey(value as object));
};

const sized = (tag: string, value: string): string =>
  tag + value.length + ':' + value;

const refKey = (value: object): string => {
  let key = objectKeys.get(value);

  if (!key) {
    key = createRadomKey();
    objectKeys.set(value, key);
  }

  return key;
};

function createRadomKey() {
  return Date.now() + '_' + randomString(16);
}
