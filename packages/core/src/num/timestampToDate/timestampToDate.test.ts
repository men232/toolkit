import { describe, expect, test } from 'vitest';
import { timestampToDate } from './timestampToDate';

describe('timestampToDate', () => {
  test('from number', () => {
    expect(timestampToDate(0).getTime()).toBe(new Date(0).getTime());
  });

  test('invalid', () => {
    expect(timestampToDate(NaN)).toBe(null);
  });
});
