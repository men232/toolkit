import type { Color } from '../types';

/**
 * Build css valid color from color channels
 *
 * @example
 * const channels = [255, 255, 255, 0.5];
 *
 * buildCssColor(channels); // 'rgba(255, 255, 255, 0.5)'
 *
 * // with applied opacity factor
 * buildCssColor(channels, 0.1); // 'rgba(255, 255, 255, 0.05)'
 *
 * @group Colors
 */
export function buildCssColor(
  [r, g, b, a = 1]: Color.ColorChannels,
  opacity = 1,
): string {
  return `rgba(${r}, ${g}, ${b}, ${a * opacity})`;
}
