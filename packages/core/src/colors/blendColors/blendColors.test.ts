import { describe, expect, test } from 'vitest';
import { blendColors } from './blendColors';

describe('blendColors', () => {
  test('mix color channels', () => {
    expect(blendColors([50, 100, 100, 1], [150, 0, 0, 1], 0.5)).toStrictEqual([
      100, 50, 50, 1,
    ]);
  });
  test('blends alpha without rounding it', () => {
    expect(
      blendColors([0, 0, 0, 0.2], [0, 0, 0, 0.6], 0.5)[3],
    ).toBeCloseTo(0.4);
    expect(blendColors([0, 0, 0, 1], [0, 0, 0, 0], 0.25)[3]).toBe(0.75);
  });
});
