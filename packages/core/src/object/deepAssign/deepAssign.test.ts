import { describe, expect, test } from 'vitest';
import { deepAssign } from './deepAssign';

describe('deepAssign', () => {
  test('basic', () => {
    const obj = {
      value: 0,
      user: {
        id: 1,
        name: 'Andrew',
      },
    };

    deepAssign(obj, {
      value: 1,
      user: {
        name: 'John',
      },
    });

    expect(obj).toStrictEqual({
      value: 1,
      user: {
        id: 1,
        name: 'John',
      },
    });
  });

  test('ignores __proto__ key from parsed JSON', () => {
    const dest = {};

    deepAssign(dest, JSON.parse('{"__proto__":{"polluted":true}}'));

    expect(({} as any).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(dest)).toBe(Object.prototype);
  });
});
