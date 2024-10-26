import type { Color } from '../types';

/**
 * Converts color channels into RGB
 * @group Colors
 */
export function channelsToRGB([r, g, b, a]: Color.ColorChannels): Color.RGBA {
  return {
    r,
    g,
    b,
    a,
  };
}
