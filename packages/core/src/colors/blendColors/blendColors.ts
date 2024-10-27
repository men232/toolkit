import { colorToChannels } from '../colorToChannels';
import type { Color } from '../types';

/**
 * Just mixing of two colors
 *
 * @example
 * const colorA = 'rgb(50, 100, 100)';
 * const colorB = 'rgb(150, 0, 0)';
 *
 * // [100, 50, 50, 1]
 * blendColors(colorA, colorB, 0.5);
 *
 * @group Colors
 */
export function blendColors(
  color1: Color.ColorChannels | string,
  color2: Color.ColorChannels | string,
  factor: number,
): Color.ColorChannels {
  const [r1, g1, b1, a1] = colorToChannels(color1);
  const [r2, g2, b2, a2] = colorToChannels(color2);

  return [
    Math.round(r1 * (1 - factor) + r2 * factor),
    Math.round(g1 * (1 - factor) + g2 * factor),
    Math.round(b1 * (1 - factor) + b2 * factor),
    Math.round(a1 * (1 - factor) + a2 * factor),
  ];
}
