import { describe, expect, test } from 'vitest';
import { hslToChannels } from './hslToChannels';

describe('channelsToHSL', () => {
  test('percent', () => {
    expect(hslToChannels('hsl(270 60% 50% / 15%)')).toStrictEqual([
      128, 51, 204, 0.15,
    ]);
  });

  test('dot alpha', () => {
    expect(hslToChannels('hsl(270 60% 50% / .15)')).toStrictEqual([
      128, 51, 204, 0.15,
    ]);
  });

  test('rad', () => {
    expect(hslToChannels('hsl(4.71239rad 60% 70% / 0.5)')).toStrictEqual([
      179, 133, 224, 0.5,
    ]);
  });
  test('negative hue wraps around the color wheel', () => {
    expect(hslToChannels('hsl(-120, 100%, 50%)')).toStrictEqual([0, 0, 255, 1]);
    expect(hslToChannels('hsl(-480, 100%, 50%)')).toStrictEqual([0, 0, 255, 1]);
    expect(hslToChannels('hsl(-0.5turn, 100%, 50%)')).toStrictEqual([0, 255, 255, 1]);
  });
});
