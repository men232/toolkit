import type { Color } from './types';

export const float = '-?\\d*(?:\\.\\d+)';
export const number = `(${float}?)`;
export const percentage = `(${float}?%)`;
export const numberOrPercentage = `(${float}?%?)`;

/**
 * Check if provided value represents color channels
 * @group Colors
 */
export function isColorChannels(value: unknown): value is Color.ColorChannels {
  return Array.isArray(value) && value.length === 4;
}
