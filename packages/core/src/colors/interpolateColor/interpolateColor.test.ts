import { expect, test } from 'vitest';
import { interpolateColor } from './interpolateColor';

test('interpolateColor', () => {
  expect(
    interpolateColor('rgb(0, 0, 0)', 'rgb(100, 100, 100)', 0.5),
  ).toStrictEqual([50, 50, 50, 1]);
});
