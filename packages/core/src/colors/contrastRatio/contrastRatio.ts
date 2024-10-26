import { round2digits } from '@/num';

/**
 * Calculate WCAG 2.0 contrast ratio of two luminance
 * @group Colors
 */
export function contrastRatio(l1: number, l2: number) {
  return round2digits((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05), 4);
}
