import { describe, expect, test } from 'vitest';
import { randomString } from './randomString';

describe('randomString', () => {
  test('basic', () => {
    expect(randomString(15).length).toBe(15);
  });
});
