import { parsePercentage } from '@/num/parsePercentage';
import { parseAlpha } from '../parseAlpha';
import type { Color } from '../types';
import { numberOrPercentage, percentage } from '../utils';

const hsl = new RegExp(
  `^
  hsla?\\(
    \\s*(-?\\d*(?:\\.\\d+)?(?:deg|rad|turn)?)\\s*,
    \\s*${percentage}\\s*,
    \\s*${percentage}\\s*
    (?:,\\s*${numberOrPercentage}\\s*)?
  \\)
  $
`.replace(/\n|\s/g, ''),
);

const hsla = new RegExp(
  `^
  hsla?\\(
    \\s*(-?\\d*(?:\\.\\d+)?(?:deg|rad|turn)?)\\s*
    \\s+${percentage}
    \\s+${percentage}
    \\s*(?:\\s*\\/\\s*${numberOrPercentage}\\s*)?
  \\)
  $
`.replace(/\n|\s/g, ''),
);

/**
 * Parse a string as a hsl color
 */
export function parseHSL(value: string): Color.HSLA | null {
  const parsed = hsla.exec(value) || hsl.exec(value);

  if (!parsed) return null;

  const [, h, s, l, a = 1] = parsed;

  let hh: any = h;
  if (hh.endsWith('turn')) {
    hh = (parseFloat(hh) * 360) / 1;
  } else if (hh.endsWith('rad')) {
    hh = Math.round((parseFloat(hh) * 180) / Math.PI);
  } else {
    hh = parseFloat(hh);
  }

  return {
    h: hh,
    s: parsePercentage(s),
    l: parsePercentage(l),
    a: parseAlpha(a === null ? 1 : a),
  };
}
