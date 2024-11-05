import { describe, expect, test } from 'vitest';
import { hasOwn } from './hasOwn';

describe('hasOwn', () => {
  test('must returns true when key exists in object', () => {
    const obj = {
      id: 1,
      details: undefined,
    };

    expect(hasOwn(obj, 'details')).toBe(true);
  });

  test('must returns false when key not exists in object', () => {
    const obj = {
      id: 1,
      details: undefined,
    };

    expect(hasOwn(obj as any, 'name')).toBe(false);
  });
});
