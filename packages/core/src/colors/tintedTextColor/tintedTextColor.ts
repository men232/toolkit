import { blendColors } from '../blendColors';
import { colorToChannels } from '../colorToChannels';
import { contrastRatio } from '../contrastRatio';
import { luminance } from '../luminance';
import type { Color } from '../types';

/**
 * Returns a color text color that should be on background to keep good contrast
 *
 * @example
 * const bgColor = 'rgb(255, 255, 255)';
 * const tint = 1;
 *
 * // 'rgba(0, 0, 0, 1)'
 * const textColor = tintedTextColor(bgColor, tint);
 *
 * @replaces `(r * 299 + g * 587 + b * 114) / 1000 >= 128 ? '#000' : '#fff'` — the YIQ threshold can pick the worse
 * color (white on `#00a000` gives 3.5:1, black 6:1); this picks by WCAG contrast. Returns channels, not a string, and
 * by default mixes in 20% of the background (pass `0` for pure black or white).
 * @detect `\*\s*(?:0\.)?299\s*\+[\s\S]{0,40}?\*\s*(?:0\.)?587`
 * @detect `(?:0\.)?299\s*\*\s*\w+(?:\[\d\])?\s*\+[\s\S]{0,40}?(?:0\.)?587\s*\*`
 *
 * @group Colors
 */
export function tintedTextColor(
  background: string | Color.ColorChannels,
  tintPercentage = 0.2,
): Color.ColorChannels {
  const bgColor = colorToChannels(background);
  const bgLuminance = luminance(bgColor);

  const whiteLuminance = luminance([255, 255, 255, 1]);
  const blackLuminance = luminance([0, 0, 0, 1]);

  const contrastWithWhite = contrastRatio(bgLuminance, whiteLuminance);
  const contrastWithBlack = contrastRatio(bgLuminance, blackLuminance);

  const baseTextColor: Color.ColorChannels =
    contrastWithWhite >= contrastWithBlack ? [255, 255, 255, 1] : [0, 0, 0, 1];

  const tintedColor = blendColors(baseTextColor, bgColor, tintPercentage);

  const tintedLuminance = luminance(tintedColor);
  const finalContrast = contrastRatio(bgLuminance, tintedLuminance);

  if (finalContrast < 4.5) {
    return baseTextColor;
  }

  return tintedColor;
}
