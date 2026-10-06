import type { Color } from '../types';
import { parseRGB } from './parseRGB';

/**
 * Parsing rgb() string as color channels
 *
 * @example
 * // [255, 0, 0, 0.2]
 * rgbToChannels('rgba(100% 0% 0% / 20%)');
 *
 * @replaces `rgb.match(/\d+/g).map(Number)` or a hand-written `/rgba?\((\d+),…/` regex — `/\d+/g` splits a `0.5` alpha
 * into `0` and `5` and ignores percentages; `rgbToChannels` parses comma and space/slash syntax, percentages and
 * decimals, rounding and clamping to 0–255. Returns `[0, 0, 0, 0]` on invalid input.
 * @detect `/\^?rgba?\\\(`
 * @detect `rgb\w*\.match\(\s?/\\d\+/g\s*\)`
 *
 * @group Colors
 */
export function rgbToChannels(value: string): Color.ColorChannels {
  const rgb = parseRGB(value);

  if (!rgb) return [0, 0, 0, 0];

  return [rgb.r, rgb.g, rgb.b, rgb.a];
}
