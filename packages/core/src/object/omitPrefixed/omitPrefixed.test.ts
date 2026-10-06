import { expect, test } from 'vitest';
import { omitPrefixed } from './omitPrefixed';

test('omitPrefixed', () => {
  const user = {
    id: 1,
    canRead: true,
    canWrite: true,
  };

  expect(omitPrefixed(user, 'can')).toStrictEqual({
    id: user.id,
  });
});

test('should keep an own __proto__ key as data', () => {
  const result: any = omitPrefixed(
    JSON.parse('{"__proto__":{"isAdmin":true},"a":1}'),
    'a',
  );
  expect(result.isAdmin).toBeUndefined();
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  expect(Object.keys(result)).toEqual(['__proto__']);
});
