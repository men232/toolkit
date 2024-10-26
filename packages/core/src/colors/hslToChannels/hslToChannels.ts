import type { Color } from '../types';
import { parseHSL } from './parseHSL';

export function hslToChannels(value: string): Color.ColorChannels {
  const parsed = parseHSL(value);

  if (!parsed) return [0, 0, 0, 0];

  let { h, s, l, a } = parsed;

  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const p = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - p * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4)),
    a,
  ];
}
