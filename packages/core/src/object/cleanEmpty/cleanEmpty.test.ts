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
  test('keeps false and 0', () => {
    const obj = { enabled: false, retries: 0, name: '', tags: [] };

    cleanEmpty(obj);

    expect(obj).toStrictEqual({ enabled: false, retries: 0 });
  });
});
