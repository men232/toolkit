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
});
