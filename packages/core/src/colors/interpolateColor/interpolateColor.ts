import { colorToChannels } from '../colorToChannels';
import type { Color } from '../types';

/**
 * Linear color interpolating
 *
 * @example
 * // 'rgba(50, 50, 50, 1)'
 * interpolateColor(
 *   'rgb(0, 0, 0)',
 *   'rgb(100, 100, 100)',
 *   0.5
 * );
 *
 * @group Colors
 */
export function interpolateColor(
  color1: string | Color.ColorChannels,
  color2: string | Color.ColorChannels,
  factor: number,
): Color.ColorChannels {
  const [r1, g1, b1, a1] = colorToChannels(color1);
  const [r2, g2, b2, a2] = colorToChannels(color2);

  return [
    Math.round(r1 + factor * (r2 - r1)),
    Math.round(g1 + factor * (g2 - g1)),
    Math.round(b1 + factor * (b2 - b1)),
    a1 + factor * (a2 - a1),
  ];
}
