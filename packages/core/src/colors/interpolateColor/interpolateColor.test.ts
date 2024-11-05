import { describe, expect, test } from 'vitest';
import { interpolateColor } from './interpolateColor';

describe('interpolateColor', () => {
  test('basic', () => {
    expect(
      interpolateColor('rgb(0, 0, 0)', 'rgb(100, 100, 100)', 0.5),
    ).toStrictEqual([50, 50, 50, 1]);
  });
});
