import { describe, expect, test } from 'vitest';
import { cleanObject } from './cleanObject';

describe('cleanObject', () => {
  test('must remove all keys', () => {
    const obj = {
      key: 1,
      key2: 2,
      emptyStr: '',
      emptyArr: [],
      emptyObj: {},
      emptyMap: new Map(),
      emptySet: new Set(),
    };

    cleanObject(obj);

    expect(Object.keys(obj)).toStrictEqual([]);
  });

  test('must remove all symbols from object', () => {
    const sym = Symbol();
    const obj = {
      [sym]: true,
    };

    cleanObject(obj);

    expect(obj[sym]).toBe(undefined);
  });
});
