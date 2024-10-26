import { expect, test } from 'vitest';
import { channelsToHex } from './channelsToHex';

test('channelsToHex', () => {
  expect(channelsToHex([255, 255, 255, 1])).toStrictEqual('#FFFFFFFF');
  expect(channelsToHex([255, 255, 255, 1], false)).toStrictEqual('#FFFFFF');
});
