import type { Color } from '../types';

/**
 * Build css valid color from color channels
 * @group Colors
 */
export function buildCssColor(
  [r, g, b, a = 1]: Color.ColorChannels,
  opacity = 1,
): string {
  return `rgba(${r}, ${g}, ${b}, ${a * opacity})`;
}
