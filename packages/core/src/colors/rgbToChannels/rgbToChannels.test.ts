import { expect, test } from 'vitest';
import { rgbToChannels } from './rgbToChannels';

test('rgbToChannels', () => {
  expect(rgbToChannels('rgb(255, 255, 255)')).toStrictEqual([255, 255, 255, 1]);
  expect(rgbToChannels('rgba(255, 255, 255, 0.5)')).toStrictEqual([
    255, 255, 255, 0.5,
  ]);
  expect(rgbToChannels('rgba(0 0 0 / 20%)')).toStrictEqual([0, 0, 0, 0.2]);
  expect(rgbToChannels('rgba(100% 0% 0% / 20%)')).toStrictEqual([
    255, 0, 0, 0.2,
  ]);
  expect(rgbToChannels('rgb(0% 42.35% 33.33%)')).toStrictEqual([0, 108, 85, 1]);
});
