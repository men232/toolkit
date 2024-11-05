import { describe, expect, test } from 'vitest';
import { strAssign } from './strAssign';

describe('strAssign', () => {
  test('basic', () => {
    expect(strAssign('Hello {{ var }}', { var: 'World' })).toBe('Hello World');
  });

  test('basic without spaces', () => {
    expect(strAssign('Hello {{var}}', { var: 'World' })).toBe('Hello World');
  });

  test('custom method', () => {
    expect(
      strAssign('Hello {{var}}', { var: 'World' }, (obj, key) => {
        return String((obj as any)[key]).toUpperCase();
      }),
    ).toBe('Hello WORLD');
  });
});
