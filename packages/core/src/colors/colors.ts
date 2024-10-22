import { isNumber, isString, noop } from '@/is';

/**
 * Color channels, format: [`red`, `green`, `blue`, `alpha`]
 */
export type ColorChannels = [number, number, number, number];

export type ColorHSL = { h: number; s: number; l: number };

/**
 * Linear color interpolating
 */
export function interpolateColor(
  color1: string | ColorChannels,
  color2: string | ColorChannels,
  factor: number,
): ColorChannels {
  const [r1, g1, b1, a1] = colorToChannels(color1);
  const [r2, g2, b2, a2] = colorToChannels(color2);

  return [
    Math.round(r1 + factor * (r2 - r1)),
    Math.round(g1 + factor * (g2 - g1)),
    Math.round(b1 + factor * (b2 - b1)),
    a1 + factor * (a2 - a1),
  ];
}

/**
 * Parse css color and returns color channels
 */
export function colorToChannels(color: string | ColorChannels): ColorChannels {
  if (isColorChannels(color)) {
    return color;
  }

  if (isString(color)) {
    color = color.trim();

    if (color[0] === '#') {
      return hexToChannels(color);
    } else if (color.startsWith('rgb')) {
      return rgbToChannels(color);
    } else if (color.startsWith('rgba')) {
      return rgbToChannels(color);
    } else if (color.startsWith('hsl')) {
      return hslToChannels(color);
    } else if (color.includes(',')) {
      const channels = color
        .split(',')
        .map(v => parseFloat(v))
        .filter(isNumber)
        .slice(0, 4);

      while (channels.length < 3) {
        channels.push(0);
      }

      return [...channels, 1].slice(0, 4) as ColorChannels;
    }
  }

  console.warn('Failed to convert color into channels', typeof color, color);
  return [0, 0, 0, 1];
}

export function luminance([r, g, b]: ColorChannels): number {
  const a = [r, g, b].map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function contrastRatio(l1: number, l2: number) {
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function tintedTextColor(
  background: string | ColorChannels,
  tintPercentage = 0.2,
): ColorChannels {
  const bgColor = colorToChannels(background);
  const bgLuminance = luminance(bgColor);

  const whiteLuminance = luminance([255, 255, 255, 1]);
  const blackLuminance = luminance([0, 0, 0, 1]);

  const contrastWithWhite = contrastRatio(bgLuminance, whiteLuminance);
  const contrastWithBlack = contrastRatio(bgLuminance, blackLuminance);

  const baseTextColor: ColorChannels =
    contrastWithWhite >= contrastWithBlack ? [255, 255, 255, 1] : [0, 0, 0, 1];

  const tintedColor = blendColors(baseTextColor, bgColor, tintPercentage);

  const tintedLuminance = luminance(tintedColor);
  const finalContrast = contrastRatio(bgLuminance, tintedLuminance);

  if (finalContrast < 4.5) {
    return baseTextColor;
  }

  return tintedColor;
}

export function blendColors(
  color1: ColorChannels | string,
  color2: ColorChannels | string,
  factor: number,
): ColorChannels {
  const [r1, g1, b1, a1] = colorToChannels(color1);
  const [r2, g2, b2, a2] = colorToChannels(color2);

  return [
    Math.round(r1 * (1 - factor) + r2 * factor),
    Math.round(g1 * (1 - factor) + g2 * factor),
    Math.round(b1 * (1 - factor) + b2 * factor),
    Math.round(a1 * (1 - factor) + a2 * factor),
  ];
}

export function channelsToHex(channels: ColorChannels) {
  const [r, g, b, a] = channels;

  const outParts = [r.toString(16), g.toString(16), b.toString(16)];

  if (isNumber(a)) {
    outParts.push(
      Math.round(a * 255)
        .toString(16)
        .substring(0, 2),
    );
  }

  // Pad single-digit output values
  outParts.forEach(function (part, i) {
    if (part.length === 1) {
      outParts[i] = '0' + part;
    }
  });

  return '#' + outParts.join('');
}

export function channelsToHSL([r, g, b]: ColorChannels): ColorHSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));

    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else if (max === b) {
      h = (r - g) / delta + 4;
    }

    h *= 60;

    if (h < 0) {
      h += 360;
    }
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function isColorChannels(value: unknown): value is ColorChannels {
  return Array.isArray(value) && value.length === 4;
}

function hslToChannels(value: string): ColorChannels {
  let r, g, b;
  const [h, s, l, a] = value
    .replace(/^(hsl|hsla)\(/, '')
    .replace(/\)$/, '')
    .replace(/\s/g, '')
    .split(',')
    .map(v => parseFloat(v));

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = function hue2rgb(p: number, q: number, t: number) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [
    Math.round((r / 100) * 255),
    Math.round((g / 100) * 255),
    Math.round((b / 100) * 255),
    Number.isFinite(a) ? a : 1,
  ];
}

export function hexToChannels(hexWithAlpha: string): ColorChannels {
  let [hex, alpha] = hexWithAlpha.replace('#', '').split('/');

  // Support for 3dight color
  if (hex.length === 3) hex = hex + hex;

  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
    alpha ? parseFloat(alpha) : 1,
  ];
}

export function rgbToChannels(value: string): ColorChannels {
  const [r, g, b, a] = value
    .replace(/^(rgb|rgba)\(/, '')
    .replace(/\)$/, '')
    .replace(/\s/g, '')
    .split(',');

  return [
    parseInt(r, 10),
    parseInt(g, 10),
    parseInt(b, 10),
    a ? parseFloat(a) : 1,
  ];
}

export function buildCssColor(
  [r, g, b, a = 1]: ColorChannels,
  opacity = 1,
): string {
  return `rgba(${r}, ${g}, ${b}, ${a * opacity})`;
}

export function alpha(color: string | ColorChannels, opacity: number): string {
  const channels = colorToChannels(color);

  return buildCssColor(channels, opacity);
}

const defaultWindow = (globalThis as any)?.window;

export function cssVariable(container: HTMLElement): (name: string) => string {
  if (!defaultWindow) return noop as any;

  const computedStyles = defaultWindow.getComputedStyle(container);

  return (name: string) => {
    const patterns = name.split('/', 2);

    if (patterns[0]?.startsWith('--')) {
      let value = computedStyles.getPropertyValue(patterns[0])?.trim();

      if (patterns[0].startsWith('--v')) {
        value = `rgb(${value})`;
      }

      patterns[0] = value;
    }

    return patterns.join('/');
  };
}
