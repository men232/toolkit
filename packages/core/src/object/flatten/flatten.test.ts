import { expect, test } from 'vitest';
import { flatten } from './flatten';

test('flatten (defaults)', () => {
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

test('flatten (custom separator)', () => {
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

test('flatten (no array)', () => {
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
