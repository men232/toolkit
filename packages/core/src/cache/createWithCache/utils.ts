import { isObject } from '@/is';

const objectKeys = new WeakMap<object, string>();

const BSON_TYPES = Object.freeze(new Set(['ObjectID', 'ObjectId']));

export const SYM_WITH_CACHE = Symbol();

export const argToKey = /*#__PURE__*/ (input: unknown): string => {
  let result = '';

  if (isObject(input)) {
    // edge case for mongoose objects
    if (BSON_TYPES.has((input as any)?._bsontype)) {
      return String(input);
    }

    let key = objectKeys.get(input);

    if (!key) {
      key = Date.now() + '_' + Math.random();
      objectKeys.set(input, key);
    }

    return key;
  } else if (Array.isArray(input)) {
    result += input.map(argToKey).join('/');
  } else {
    result = String(input);
  }

  return result;
};
