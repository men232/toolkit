import { describe, expect, test } from 'vitest';
import { channelsToHSL } from './channelsToHSL';

describe('channelsToHSL', () => {
  test('basic', () => {
    expect(channelsToHSL([0, 0, 0, 1])).toStrictEqual({
      a: 1,
      h: 0,
      l: 0,
      s: 0,
    });
  });
});
