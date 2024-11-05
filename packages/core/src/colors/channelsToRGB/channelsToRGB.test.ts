import { describe, expect, test } from 'vitest';
import { channelsToRGB } from './channelsToRGB';

describe('channelsToRGB', () => {
  test('basic', () => {
    expect(channelsToRGB([255, 200, 100, 1])).toStrictEqual({
      r: 255,
      g: 200,
      b: 100,
      a: 1,
    });
  });
});
