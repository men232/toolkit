import { isNumber, isString } from '@/is';
import { hexToChannels } from '../hexToChannels';
import { hslToChannels } from '../hslToChannels';
import { rgbToChannels } from '../rgbToChannels';
import type { Color } from '../types';
import { isColorChannels } from '../utils';

/**
 * Parse css color and returns color channels
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
