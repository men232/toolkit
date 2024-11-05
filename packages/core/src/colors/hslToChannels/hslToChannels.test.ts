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
});
