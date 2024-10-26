import { expect, test } from 'vitest';
import { hexToChannels } from './hexToChannels';

test('channelsToHSL (len: 3)', () => {
  expect(hexToChannels('#FFF')).toStrictEqual([255, 255, 255, 1]);
});

test('channelsToHSL (len: 4)', () => {
  expect(hexToChannels('#FFFC')).toStrictEqual([255, 255, 255, 0.8]);
});

test('channelsToHSL (len: 6)', () => {
  expect(hexToChannels('#FFFFFF')).toStrictEqual([255, 255, 255, 1]);
});

test('channelsToHSL (len: 8)', () => {
  expect(hexToChannels('#FFFFFFCC')).toStrictEqual([255, 255, 255, 0.8]);
});

test('channelsToHSL (slash alpha)', () => {
  expect(hexToChannels('#FFFFFF/0.6')).toStrictEqual([255, 255, 255, 0.6]);
});
