import { expect, test } from 'vitest';
import { omit } from './omit';

test('omit', () => {
  const user = {
    id: 1,
    createdAt: new Date(0),
    details: {
      name: 'Andrew',
      roles: ['ADMIN'],
    },
  };

  expect(omit(user, ['details'])).toStrictEqual({
    id: user.id,
    createdAt: user.createdAt,
  });
});

test('should keep an own __proto__ key as data', () => {
  const result: any = omit(JSON.parse('{"__proto__":{"isAdmin":true},"a":1}'), [
    'a',
  ]);
  expect(result.isAdmin).toBeUndefined();
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  expect(Object.keys(result)).toEqual(['__proto__']);
  expect(result.__proto__).not.toBe(Object.prototype);
});
