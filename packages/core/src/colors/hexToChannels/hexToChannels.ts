import { parseAlpha } from '../parseAlpha';
import type { Color } from '../types';
import { parseHEX } from './parseHEX';

/**
 * Parsing hex string as color channels
 *
 * @example
 * hexToChannels('#FFFFFF'); // [255, 255, 255, 1]
 * hexToChannels('#FFF'); // [255, 255, 255, 1]
 *
 * @replaces `parseInt(hex.slice(1, 3), 16)` ×3 or `/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i` — both miss `#abc`
 * shorthand and `#rrggbbaa` alpha; `hexToChannels` handles 3/4/6/8 digits and a `/alpha` suffix. Requires the
 * leading `#` and returns `[0, 0, 0, 0]` (not `null`) on invalid input.
 * @detect `parseInt\(\s*[\w.]+\.(?:slice|substring|substr)\(\s*[0-5]\s*,\s*[1-7]\s*\)\s*,\s*16\s*\)`
 * @detect `\[(?:a-f\\d|\\da-f|0-9a-f|a-f0-9)\]\{2\}\)\(`
 * @detect `(?:function\s+|const\s+)hexToRgba?\b`
 *
 * @group Colors
 */
export function hexToChannels(hexWithAlpha: string): Color.ColorChannels {
  const [hex, alpha] = hexWithAlpha.split('/');
  const channels = parseHEX(hex);

  if (!channels) return [0, 0, 0, 0];

  if (alpha) {
    channels[3] = parseAlpha(alpha);
  }

  return channels;
}
