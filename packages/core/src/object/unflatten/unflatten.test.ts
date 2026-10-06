import { describe, expect, test } from 'vitest';
import { unflatten } from './unflatten';

describe('unflatten', () => {
  test('defaults', () => {
    const obj = {
      id: 1,
      details_name: 'Andrew',
      details_roles_0: 'ADMIN',
      details_roles_1: 'USER',
    };

    expect(unflatten(obj)).toStrictEqual({
      id: 1,
      details: {
        name: 'Andrew',
        roles: ['ADMIN', 'USER'],
      },
    });
  });

  test('custom separator', () => {
    const obj = {
      id: 1,
      'details.name': 'Andrew',
      'details.roles.0': 'ADMIN',
      'details.roles.1': 'USER',
    };

    expect(unflatten(obj, '.')).toStrictEqual({
      id: 1,
      details: {
        name: 'Andrew',
        roles: ['ADMIN', 'USER'],
      },
    });
  });

  test('should handle invalid value', () => {
    expect(unflatten(null as any, '.')).toStrictEqual({});
  });
  test('should return an empty object for an empty input', () => {
    expect(unflatten({})).toStrictEqual({});
  });
  test('should not write through inherited properties', () => {
    const toString = Object.prototype.toString;
    const hasOwn = Object.prototype.hasOwnProperty;

    expect(unflatten({ toString_a: 1 })).toStrictEqual({ toString: { a: 1 } });
    expect((toString as any).a).toBeUndefined();

    expect(unflatten({ hasOwnProperty_call: 1 })).toStrictEqual({
      hasOwnProperty: { call: 1 },
    });
    expect(hasOwn.call).toBe(Function.prototype.call);

    expect(unflatten({ a_0: 1, a_push_x: 2 })).toStrictEqual({
      a: Object.assign([1], { push: { x: 2 } }),
    });
    expect((Array.prototype.push as any).x).toBeUndefined();
  });

  test('should replace a primitive with a nested object', () => {
    expect(unflatten({ a: 1, a_b: 2 })).toStrictEqual({ a: { b: 2 } });
  });
});
