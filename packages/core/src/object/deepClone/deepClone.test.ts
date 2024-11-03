import { expect, test } from 'vitest';
import { deepClone } from './deepClone';

test('deepClone', () => {
  const obj = {
    value: 0,
    user: {
      id: 1,
      name: 'Andrew',
      roles: ['ADMIN', 'USER'],
    },
  };

  const obj2 = deepClone(obj);

  expect(obj).toStrictEqual(obj2);

  expect(Object.is(obj, obj2)).toBe(false);
});
