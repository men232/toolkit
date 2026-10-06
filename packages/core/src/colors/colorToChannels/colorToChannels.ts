import { isNumber, isString } from '@/is';
import { hexToChannels } from '../hexToChannels';
import { hslToChannels } from '../hslToChannels';
import { rgbToChannels } from '../rgbToChannels';
import type { Color } from '../types';
import { isColorChannels } from '../utils';

/**
 * Parse css color and returns color channels
 *
 * @replaces `if (c.startsWith('#')) return hexToRgb(c); if (c.startsWith('rgb')) …` — one call parses hex (3/4/6/8
 * digits), legacy and modern `rgb()`/`hsl()` (percentages, deg/rad/turn) and `"r,g,b"` into `[r, g, b, a]`. Never throws:
 * named colors and `var()` log a warning and give opaque black, malformed hex/`rgb()`/`hsl()` give `[0, 0, 0, 0]`.
 * @detect `startsWith\(\s*['"]#['"]\s*\)[\s\S]{0,300}?startsWith\(\s*['"](?:rgb|hsl)`
 * @detect `(?:function\s+|const\s+)(?:parseColor|colorToRgba?)\b`
 *
 * @group Colors
 */
export function colorToChannels(
  color: string | Color.ColorChannels,
): Color.ColorChannels {
  if (isColorChannels(color)) {
    return color;
  }

  if (isString(color)) {
    color = color.trim();

    if (color[0] === '#') {
      return hexToChannels(color);
    } else if (color.startsWith('rgb')) {
      return rgbToChannels(color);
    } else if (color.startsWith('rgba')) {
      return rgbToChannels(color);
    } else if (color.startsWith('hsl')) {
      return hslToChannels(color);
    } else if (color.includes(',')) {
      const channels = color
        .split(',')
        .map(v => parseFloat(v))
        .filter(isNumber)
        .slice(0, 4);

      while (channels.length < 3) {
        channels.push(0);
      }

      return [...channels, 1].slice(0, 4) as Color.ColorChannels;
    }
  }

  console.warn('Failed to convert color into channels', typeof color, color);
  return [0, 0, 0, 1];
}
