import { describe, expect, test } from 'vitest';
import { pickPrefixed } from './pickPrefixed';

describe('pickPrefixed', () => {
  test('defaults', () => {
    const user = {
      id: 1,
      canRead: true,
      canWrite: true,
    };

    expect(pickPrefixed(user, 'can')).toStrictEqual({
      canRead: user.canRead,
      canWrite: user.canWrite,
    });
  });

  test('prefixTrim', () => {
    const user = {
      id: 1,
      canRead: true,
      canWrite: true,
    };

    expect(
      pickPrefixed(user, { prefix: 'can', prefixTrim: true }),
    ).toStrictEqual({
      Read: user.canRead,
      Write: user.canWrite,
    });
  });
});

test('should keep an own __proto__ key as data', () => {
  const result: any = pickPrefixed(
    JSON.parse('{"__proto__":{"isAdmin":true},"a":1}'),
    '__',
  );
  expect(result.isAdmin).toBeUndefined();
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  expect(Object.keys(result)).toEqual(['__proto__']);
});
