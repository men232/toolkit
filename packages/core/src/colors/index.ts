import { parseHEX } from './hexToChannels/parseHEX';
import { parseHSL } from './hslToChannels/parseHSL';
import { parseRGB } from './rgbToChannels/parseRGB';
import type { Color } from './types';

export type { Color } from './types';

export type ColorChannels = Color.ColorChannels;

/**
 * General color parser api
 * @group Colors
 */
export const ColorParser = {
  HSL: parseHSL,
  RGB: parseRGB,
  HEX: parseHEX,
};

export { isColorChannels } from './utils';

export * from './alpha';
export * from './blendColors';
export * from './buildCssColor';
export * from './channelsToHex';
export * from './channelsToHSL';
export * from './channelsToRGB';
export * from './colorToChannels';
export * from './contrastRatio';
export * from './cssVariable';
export * from './hexToChannels';
export * from './hslToChannels';
export * from './interpolateColor';
export * from './luminance';
export * from './parseAlpha';
export * from './rgbToChannels';
export * from './tintedTextColor';
