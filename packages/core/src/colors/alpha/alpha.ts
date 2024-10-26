import { buildCssColor } from '../buildCssColor';
import { colorToChannels } from '../colorToChannels';
import type { Color } from '../types';

/**
 * Returns css valid color with adjusted alpha channel
 * @group Colors
 */
export function alpha(
  color: string | Color.ColorChannels,
  opacity: number,
): string {
  const [r, g, b] = colorToChannels(color);

  return buildCssColor([r, g, b, opacity], 1);
}
