import { describe, expect, test } from 'vitest';
import { flatten } from './flatten';

describe('flatten', () => {
  test('defaults', () => {
    const obj = {
      id: 1,
      details: {
        name: 'Andrew',
        roles: ['ADMIN', 'USER'],
      },
    };

    expect(flatten(obj)).toStrictEqual({
      id: 1,
      details_name: 'Andrew',
      details_roles_0: 'ADMIN',
      details_roles_1: 'USER',
    });
  });

  test('custom separator', () => {
    const obj = {
      id: 1,
      details: {
        name: 'Andrew',
        roles: ['ADMIN', 'USER'],
      },
    };

    expect(flatten(obj, { separator: '.' })).toStrictEqual({
      id: 1,
      'details.name': 'Andrew',
      'details.roles.0': 'ADMIN',
      'details.roles.1': 'USER',
    });
  });

  test('no array', () => {
    const obj = {
      id: 1,
      details: {
        name: 'Andrew',
        roles: ['ADMIN', 'USER'],
      },
    };

    expect(flatten(obj, { withArrays: false })).toStrictEqual({
      id: 1,
      details_name: 'Andrew',
      details_roles: ['ADMIN', 'USER'],
    });
  });

  test('should handle invalid value', () => {
    expect(flatten(null as any)).toStrictEqual({});
  });

  test('should handle custom prefix', () => {
    expect(
      flatten(
        { id: 1, name: 'Andrew', details: { role: 'admin' } },
        { initialPrefix: 'test-' },
      ),
    ).toStrictEqual({
      'test-id': 1,
      'test-name': 'Andrew',
      'test-details_role': 'admin',
    });
  });
});
