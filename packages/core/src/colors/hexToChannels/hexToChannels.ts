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
