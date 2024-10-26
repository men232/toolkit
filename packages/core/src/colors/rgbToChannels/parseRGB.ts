import { isNumber, isString } from '@/is';
import { clamp } from '@/num';
import { parseAlpha } from '../parseAlpha';
import type { Color } from '../types';
import { number, numberOrPercentage, percentage } from '../utils';

const rgb3Numbers = new RegExp(
  `^
  rgba?\\(
    \\s*${number}\\s*,
    \\s*${number}\\s*,
    \\s*${number}\\s*
    (?:,\\s*${numberOrPercentage}\\s*)?
  \\)
  $
`.replace(/\n|\s/g, ''),
);

const rgb3Percent = new RegExp(
  `^
  rgba?\\(
    \\s*${percentage}\\s*,
    \\s*${percentage}\\s*,
    \\s*${percentage}\\s*
    (?:,\\s*${numberOrPercentage}\\s*)?
  \\)
  $
`.replace(/\n|\s/g, ''),
);

const rgb4Numbers = new RegExp(
  `^
  rgba?\\(
    \\s*${number}
    \\s+${number}
    \\s+${number}
    \\s*(?:\\s*\\/\\s*${numberOrPercentage}\\s*)?
  \\)
$
`.replace(/\n|\s/g, ''),
);

const rgb4Percent = new RegExp(
  `^
  rgba?\\(
    \\s*${percentage}
    \\s+${percentage}
    \\s+${percentage}
    \\s*(?:\\s*\\/\\s*${numberOrPercentage}\\s*)?
  \\)
$
`.replace(/\n|\s/g, ''),
);

const parseValue = (num: string | number) => {
  let n = num;
  if (!isNumber(n))
    n = n.endsWith('%') ? (parseFloat(n) * 255) / 100 : parseFloat(n);
  return clamp(Math.round(n), 0, 255);
};

export function parseRGB(value: unknown): Color.RGBA | null {
  if (!isString(value)) return null;

  const rgb =
    rgb4Numbers.exec(value) ||
    rgb4Percent.exec(value) ||
    rgb3Numbers.exec(value) ||
    rgb3Percent.exec(value);

  if (!rgb) return null;

  const [, r, g, b, a] = rgb;

  return {
    r: parseValue(r),
    g: parseValue(g),
    b: parseValue(b),
    a: parseAlpha(a),
  };
}
