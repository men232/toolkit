import { describe, expect, test } from 'vitest';
import { rgbToChannels } from './rgbToChannels';

describe('rgbToChannels', () => {
  test('rgb numbers', () => {
    expect(rgbToChannels('rgb(255, 255, 255)')).toStrictEqual([
      255, 255, 255, 1,
    ]);
  });

  test('rgba numbers', () => {
    expect(rgbToChannels('rgba(255, 255, 255, 0.5)')).toStrictEqual([
      255, 255, 255, 0.5,
    ]);
  });

  test('rgba alpha percent', () => {
    expect(rgbToChannels('rgba(0 0 0 / 20%)')).toStrictEqual([0, 0, 0, 0.2]);
  });

  test('rgba all percent', () => {
    expect(rgbToChannels('rgba(100% 0% 0% / 20%)')).toStrictEqual([
      255, 0, 0, 0.2,
    ]);

    expect(rgbToChannels('rgb(0% 42.35% 33.33%)')).toStrictEqual([
      0, 108, 85, 1,
    ]);
  });
});
