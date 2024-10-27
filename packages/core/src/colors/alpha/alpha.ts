import { buildCssColor } from '../buildCssColor';
import { colorToChannels } from '../colorToChannels';
import { parseAlpha } from '../parseAlpha';
import type { Color } from '../types';

/**
 * Returns css valid color with adjusted alpha channel
 *
 * @example
 * alpha('rgba(0, 0, 0, 0.87)', 1); // 'rgba(0, 0, 0, 1)'
 *
 * @group Colors
 */
export function alpha(
  color: string | Color.ColorChannels,
  newAlpha: number,
): string {
  const [r, g, b] = colorToChannels(color);

  return buildCssColor([r, g, b, parseAlpha(newAlpha)], 1);
}
