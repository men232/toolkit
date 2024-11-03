import { expect, test } from 'vitest';
import { cleanObject } from './cleanObject';

test('cleanObject', () => {
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
