import { describe, expect, test } from 'vitest';
import { blendColors } from './blendColors';

describe('blendColors', () => {
  test('mix color channels', () => {
    expect(blendColors([50, 100, 100, 1], [150, 0, 0, 1], 0.5)).toStrictEqual([
      100, 50, 50, 1,
    ]);
  });
});
