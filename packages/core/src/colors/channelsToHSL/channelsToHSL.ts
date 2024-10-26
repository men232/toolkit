import { parseAlpha } from '../parseAlpha';
import type { Color } from '../types';

/**
 * Converts color channels into HSL
 * @group Colors
 */
export function channelsToHSL([r, g, b, a]: Color.ColorChannels): Color.HSLA {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));

    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else if (max === b) {
      h = (r - g) / delta + 4;
    }

    h *= 60;

    if (h < 0) {
      h += 360;
    }
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    a: parseAlpha(a),
  };
}
