import { describe, expect, test } from 'vitest';
import { timestamp } from './timestamp';

describe('timestamp', () => {
  test('from number', () => {
    expect(timestamp(1730642875273)).toBe(1730642875);
  });

  test('from date', () => {
    expect(timestamp(new Date(0))).toBe(0);
  });

  test('invalid', () => {
    expect(timestamp(NaN)).toBe(NaN);
  });
});
