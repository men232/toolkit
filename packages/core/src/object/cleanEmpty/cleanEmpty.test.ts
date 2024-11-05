import { describe, expect, test } from 'vitest';
import { cleanEmpty } from './cleanEmpty';

describe('cleanEmpty', () => {
  test('str + arr + obj + map + set', () => {
    const obj = {
      key: 1,
      key2: 2,
      emptyStr: '',
      emptyArr: [],
      emptyObj: {},
      emptyMap: new Map(),
      emptySet: new Set(),
    };

    const res = cleanEmpty(obj);

    expect(Object.keys(obj)).toStrictEqual(['key', 'key2']);

    expect(Object.is(obj, res)).toBe(true);
  });
});
