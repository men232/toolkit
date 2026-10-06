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
 * @replaces `hex + '80'`, a template that appends two hex digits to a color, or a hand-written `hexToRgba(hex, a)` —
 * appending digits only works on 6-digit hex; `alpha` accepts every format `colorToChannels` parses and returns
 * `rgba(r, g, b, a)`, replacing (not multiplying) the existing alpha. Named colors and `var()` warn and become black.
 * @detect `(?:[Cc]olor|[Hh]ex)\w*\s*\+\s*['"][0-9a-fA-F]{2}['"]`
 * @detect `\$\{\s*[\w.]*(?:[Cc]olor|[Hh]ex)\w*\s*\}[0-9a-fA-F]{2}\x60`
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
