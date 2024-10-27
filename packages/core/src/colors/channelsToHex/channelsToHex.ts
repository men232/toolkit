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
    r.toString(16).toUpperCase(),
    g.toString(16).toUpperCase(),
    b.toString(16).toUpperCase(),
  ];

  if (withAlpha && isNumber(a)) {
    outParts.push(
      Math.round(a * 255)
        .toString(16)
        .substring(0, 2)
        .toUpperCase(),
    );
  }

  // Pad single-digit output values
  outParts.forEach(function (part, i) {
    if (part.length === 1) {
      outParts[i] = '0' + part;
    }
  });

  return '#' + outParts.join('');
}
