import { describe, expect, test } from 'vitest';
import { escapeNumeric } from './escapeNumeric';

describe('escapeNumeric', () => {
  test('escapeNumeric', () => {
    expect(escapeNumeric('10 times to do it 5 times')).toBe('105');
  });
});
