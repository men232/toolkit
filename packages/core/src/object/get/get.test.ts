import { describe, expect, test } from 'vitest';
import { get } from './get';

describe('get', () => {
  test('dot notation', () => {
    const obj = {
      id: 1,
      details: {
        name: 'Andrew',
        roles: ['ADMIN', 'USER'],
      },
    };

    expect(get(obj, 'details.name')).toBe(obj.details.name);
  });

  test('dot notation array', () => {
    const obj = {
      id: 1,
      details: {
        name: 'Andrew',
        roles: ['ADMIN', 'USER'],
      },
    };

    expect(get(obj, 'details.roles[0]')).toBe(obj.details.roles[0]);
  });
});
