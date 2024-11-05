import { describe, expect, test } from 'vitest';
import { hexToChannels } from './hexToChannels';

describe('hexToChannels', () => {
  test('len: 3', () => {
    expect(hexToChannels('#FFF')).toStrictEqual([255, 255, 255, 1]);
  });

  test('len: 4', () => {
    expect(hexToChannels('#FFFC')).toStrictEqual([255, 255, 255, 0.8]);
  });

  test('len: 6', () => {
    expect(hexToChannels('#FFFFFF')).toStrictEqual([255, 255, 255, 1]);
  });

  test('len: 8', () => {
    expect(hexToChannels('#FFFFFFCC')).toStrictEqual([255, 255, 255, 0.8]);
  });

  test('slash alpha', () => {
    expect(hexToChannels('#FFFFFF/0.6')).toStrictEqual([255, 255, 255, 0.6]);
  });
});
