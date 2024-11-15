import { isNumber } from '@/is';
import type { Color } from '../types';

/**
 * Converts color channels into hex
 *
 * @example
 * const channels = [255, 255, 255, 1];
 *
 * // with alpha channel
 * channelsToHex(channels); // '#FFFFFFFF'
 *
 * // without alpha channel
 * channelsToHex(channels, false); // '#FFFFFF'
 * @group Colors
 */
export function channelsToHex(
  channels: Color.ColorChannels,
  withAlpha: boolean = true,
) {
  const [r, g, b, a] = channels;

  const outParts = [
    r.toString(16).toUpperCase().padStart(2, '0'),
    g.toString(16).toUpperCase().padStart(2, '0'),
    b.toString(16).toUpperCase().padStart(2, '0'),
  ];

  if (withAlpha && isNumber(a)) {
    outParts.push(
      Math.round(a * 255)
        .toString(16)
        .substring(0, 2)
        .toUpperCase()
        .padStart(2, '0'),
    );
  }

  return '#' + outParts.join('');
}
