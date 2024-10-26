import { expect, test } from 'vitest';
import { hslToChannels } from './hslToChannels';

test('channelsToHSL', () => {
  expect(hslToChannels('hsl(270 60% 50% / 15%)')).toStrictEqual([
    128, 51, 204, 0.15,
  ]);

  expect(hslToChannels('hsl(270 60% 50% / .15)')).toStrictEqual([
    128, 51, 204, 0.15,
  ]);

  expect(hslToChannels('hsl(4.71239rad 60% 70% / 0.5)')).toStrictEqual([
    179, 133, 224, 0.5,
  ]);
});
