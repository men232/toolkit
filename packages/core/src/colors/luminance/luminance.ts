import type { Color } from '../types';

/**
 * Calculate luminance of color
 *
 * @example
 * luminance([255, 255, 255, 1]); // 1
 * luminance([0, 0, 0, 1]); // 0
 *
 * @replaces The WCAG relative-luminance formula typed by hand (`0.2126 * R + 0.7152 * G + 0.0722 * B` after the
 * `c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4` linearization) — skipping the linearization is the usual bug.
 * Takes `[r, g, b, a]` in 0–255, not a CSS string; pair with `contrastRatio`.
 * @detect `0\.2126[\s\S]{0,60}?0\.7152`
 * @detect `0\.0(?:3928|4045)\b`
 *
 * @group Colors
 */
export function luminance([r, g, b]: Color.ColorChannels): number {
  const a = [r, g, b].map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}
