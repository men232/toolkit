import { describe, expect, test } from 'vitest';
import { hex } from './hex';

describe('hex', () => {
  test('basic', () => {
    expect(hex(new Uint8Array([0, 10]))).toBe('000a');
  });
});
