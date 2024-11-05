import { describe, expect, test } from 'vitest';
import { channelsToHex } from './channelsToHex';

describe('channelsToHex', () => {
  test('alpha should be included by default', () => {
    expect(channelsToHex([255, 255, 255, 1])).toStrictEqual('#FFFFFFFF');
  });

  test('without alpha', () => {
    expect(channelsToHex([255, 255, 255, 1], false)).toStrictEqual('#FFFFFF');
  });
});
