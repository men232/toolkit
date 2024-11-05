import { describe, expect, test } from 'vitest';
import { escapeRegExp } from './escapeRegExp';

describe('escapeRegExp', () => {
  test('escapeRegExp', () => {
    expect(escapeRegExp('Andrew L.')).toBe('Andrew L\\.');
  });
});
