import { expect, test } from 'vitest';
import { deepDefaults } from './deepDefaults';

test('deepDefaults', () => {
  const obj = {
    value: 0,
    user: {
      id: 1,
      name: 'Andrew',
      roles: ['ADMIN', 'USER'],
    },
  };

  const obj2 = deepDefaults(obj, {
    user: {
      name: 'John',
      createdAt: 1969493856921,
    },
  });

  expect(obj2).toStrictEqual({
    value: 0,
    user: {
      id: 1,
      name: 'Andrew',
      roles: ['ADMIN', 'USER'],
      createdAt: 1969493856921,
    },
  });

  expect(Object.is(obj, obj2)).toBe(true);
});
