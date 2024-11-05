import { describe, expect, test } from 'vitest';
import { colorToChannels } from './colorToChannels';

describe('colorToChannels', () => {
  test('rgb', () => {
    expect(colorToChannels('rgb(0, 0, 0)')).toStrictEqual([0, 0, 0, 1]);
  });

  test('rgba', () => {
    expect(colorToChannels('rgba(0, 0, 0, 0.5)')).toStrictEqual([0, 0, 0, 0.5]);
  });

  test('hex', () => {
    expect(colorToChannels('#FFF')).toStrictEqual([255, 255, 255, 1]);
    expect(colorToChannels('#FFFFFF')).toStrictEqual([255, 255, 255, 1]);
  });

  test('hsl', () => {
    expect(colorToChannels('hsl(0, 100%, 50%)')).toStrictEqual([255, 0, 0, 1]);
  });
});
