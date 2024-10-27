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
