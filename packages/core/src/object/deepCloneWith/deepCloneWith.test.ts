import { expect, test } from 'vitest';
import { deepCloneWith } from './deepCloneWith';

test('deepCloneWith', () => {
  const obj = {
    value: 0,
    user: {
      id: 1,
      name: 'Andrew',
      roles: ['ADMIN', 'USER'],
    },
  };

  const obj2 = deepCloneWith(obj, [
    value => {
      if (value === 'ADMIN') return 'SUPER_ADMIN';
    },
    value => {
      if (value === 'SUPER_ADMIN') return 'ROOT_ADMIN';
    },
  ]);

  expect(obj2).toStrictEqual({
    value: 0,
    user: {
      id: 1,
      name: 'Andrew',
      roles: ['ROOT_ADMIN', 'USER'],
    },
  });

  expect(Object.is(obj, obj2)).toBe(false);
});
