import { isString } from '@/is';
import { parseAlpha } from '../parseAlpha';
import type { Color } from '../types';

const hexReg = new RegExp(
  /^#([a-f0-9]{3,4}|[a-f0-9]{4}(?:[a-f0-9]{2}){1,2})\b$/,
  'i',
);

export function parseHEX(value: unknown): Color.ColorChannels | null {
  if (!isString(value)) return null;

  const parsed = hexReg.exec(value);

  if (!parsed) return null;

  let a = 1;
  let hex = parsed[0].replace(/^#/, '');

  if (hex.length === 8) {
    a = Number.parseInt(hex.slice(6, 8), 16) / 255;
    hex = hex.slice(0, 6);
  }

  if (hex.length === 4) {
    a = Number.parseInt(hex.slice(3, 4).repeat(2), 16) / 255;
    hex = hex.slice(0, 3);
  }

  if (hex.length === 3) hex = hex + hex;

  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
    parseAlpha(a),
  ];
}
