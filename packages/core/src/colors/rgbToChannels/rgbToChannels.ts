import type { Color } from '../types';
import { parseRGB } from './parseRGB';

/**
 * Parsing rgb() string as color channels
 *
 * @example
 * // [255, 0, 0, 0.2]
 * rgbToChannels('rgba(100% 0% 0% / 20%)');
 *
 * @group Colors
 */
export function rgbToChannels(value: string): Color.ColorChannels {
  const rgb = parseRGB(value);

  if (!rgb) return [0, 0, 0, 0];

  return [rgb.r, rgb.g, rgb.b, rgb.a];
}
