export namespace Color {
  /**
   * From 0 to 1
   */
  export type Alpha = number;

  export type HSLA = { h: number; s: number; l: number; a: Alpha };

  export type RGBA = { r: number; g: number; b: number; a: Alpha };

  export type HEX = string;

  /**
   * Unified color representation in [red, green, blue, alpha]
   */
  export type ColorChannels = [number, number, number, number];
}
