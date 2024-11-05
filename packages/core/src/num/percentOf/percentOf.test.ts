import { describe, expect, test } from 'vitest';
import { percentOf } from './percentOf';

describe('percentOf', () => {
  test('basic', () => {
    expect(percentOf(200, 20)).toBe(40);
  });
});
