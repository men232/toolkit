import { describe, expect, test } from 'vitest';
import { pick } from './pick';

describe('pick', () => {
  test('must pick only provided keys', () => {
    const user = {
      id: 1,
      canRead: true,
      canWrite: true,
    };

    expect(pick(user, ['id'])).toStrictEqual({
      id: user.id,
    });
  });

  test('must not define key in resulted object when key not exists', () => {
    const user = {
      id: 1,
      canRead: true,
      canWrite: true,
    };

    expect(pick(user, ['id', 'roles'])).toStrictEqual({
      id: user.id,
    });
  });
});

test('should keep an own __proto__ key as data', () => {
  const result: any = pick(JSON.parse('{"__proto__":{"isAdmin":true},"a":1}'), [
    '__proto__',
    'a',
  ] as any);
  expect(result.isAdmin).toBeUndefined();
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  expect(Object.keys(result)).toEqual(['__proto__', 'a']);
});
