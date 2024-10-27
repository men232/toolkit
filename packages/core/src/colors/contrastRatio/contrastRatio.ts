import { round2digits } from '@/num';

/**
 * Calculate WCAG 2.0 contrast ratio of two luminance
 *
 * @example
 * const l1 = luminance([255, 255, 255, 1]);
 * const l2 = luminance([0, 0, 0, 1]);
 *
 * contrastRatio(l1, l2); // 21
 *
 * @group Colors
 */
export function contrastRatio(l1: number, l2: number) {
  return round2digits((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05), 4);
}
