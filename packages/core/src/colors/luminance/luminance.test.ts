import { describe, expect, test } from 'vitest';
import { luminance } from '../luminance';

describe('luminance', () => {
  test('basic', () => {
    const l1 = luminance([255, 255, 255, 1]);
    const l2 = luminance([0, 0, 0, 1]);

    expect(l1).toBe(1);
    expect(l2).toBe(0);
  });
});
