import { describe, expect, test } from 'vitest';
import { has } from './has';

describe('has', () => {
  test('key = undefined must returns true', () => {
    const obj = {
      id: 1,
      details: undefined,
    };

    expect(has(obj, ['details'])).toBe(true);
  });

  test('must returns true when all keys exists', () => {
    const obj = {
      id: 1,
      details: undefined,
    };

    expect(has(obj, ['details', 'id'])).toBe(true);
  });

  test('must returns false when one of key not exists', () => {
    const obj = {
      id: 1,
      details: undefined,
    };

    expect(has(obj, ['id', 'name'])).toBe(false);
  });
});
