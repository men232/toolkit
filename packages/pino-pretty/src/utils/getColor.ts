/**
 * Based on https://github.com/jorgebucaran/colorette
 * Read LICENSE file for more information
 * https://github.com/jorgebucaran/colorette/blob/20fc196d07d0f87c61e0256eadd7831c79b24108/index.js
 */
import * as tty from 'node:tty';

// TODO: Migrate to std-env
const {
  env = {},
  argv = [],
  platform = '',
} = typeof process === 'undefined' ? {} : process;
const isDisabled = 'NO_COLOR' in env || argv.includes('--no-color');
const isForced = 'FORCE_COLOR' in env || argv.includes('--color');
const isWindows = platform === 'win32';
const isDumbTerminal = env.TERM === 'dumb';
const isCompatibleTerminal =
  tty && tty.isatty && tty.isatty(1) && env.TERM && !isDumbTerminal;
const isCI =
  'CI' in env &&
  ('GITHUB_ACTIONS' in env || 'GITLAB_CI' in env || 'CIRCLECI' in env);

/**
 * Determines support for terminal colours based on the environment and capabilities of the terminal.
 * @type {boolean} isColorSupported - Indicates whether colour support is enabled in the terminal.
 */
const isColorSupported =
  !isDisabled &&
  (isForced || (isWindows && !isDumbTerminal) || isCompatibleTerminal || isCI);

function replaceClose(
  index: number,
  string: string,
  close: string,
  replace: string,
  head = string.slice(0, Math.max(0, index)) + replace,
  tail = string.slice(Math.max(0, index + close.length)),
  next = tail.indexOf(close),
): string {
  return head + (next < 0 ? tail : replaceClose(next, tail, close, replace));
}

function clearBleed(
  index: number,
  string: string,
  open: string,
  close: string,
  replace: string,
) {
  return index < 0
    ? open + string + close
    : open + replaceClose(index, string, close, replace) + close;
}

function filterEmpty(
  open: string,
  close: string,
  replace = open,
  at = open.length + 1,
) {
  return (string: string) =>
    string || !(string === '' || string === undefined)
      ? clearBleed(
          ('' + string).indexOf(close, at),
          string,
          open,
          close,
          replace,
        )
      : '';
}

function init(open: number, close: number, replace?: string) {
  return filterEmpty(`\u001B[${open}m`, `\u001B[${close}m`, replace);
}

function init256Color(code: number, isBg = false) {
  const prefix = isBg ? '48;5;' : '38;5;';
  const closeCode = isBg ? 49 : 39;
  return filterEmpty(`\u001B[${prefix}${code}m`, `\u001B[${closeCode}m`);
}

const colorDefs = {
  reset: init(0, 0),
  bold: init(1, 22, '\u001B[22m\u001B[1m'),
  dim: init(2, 22, '\u001B[22m\u001B[2m'),
  italic: init(3, 23),
  underline: init(4, 24),
  inverse: init(7, 27),
  hidden: init(8, 28),
  strikethrough: init(9, 29),
  black: init(30, 39),
  red: init(31, 39),
  green: init(32, 39),
  yellow: init(33, 39),
  blue: init(34, 39),
  magenta: init(35, 39),
  cyan: init(36, 39),
  white: init(37, 39),
  gray: init(90, 39),
  bgBlack: init(40, 49),
  bgRed: init(41, 49),
  bgGreen: init(42, 49),
  bgYellow: init(43, 49),
  bgBlue: init(44, 49),
  bgMagenta: init(45, 49),
  bgCyan: init(46, 49),
  bgWhite: init(47, 49),
  blackBright: init(90, 39),
  redBright: init(91, 39),
  greenBright: init(92, 39),
  yellowBright: init(93, 39),
  blueBright: init(94, 39),
  magentaBright: init(95, 39),
  cyanBright: init(96, 39),
  whiteBright: init(97, 39),
  bgBlackBright: init(100, 49),
  bgRedBright: init(101, 49),
  bgGreenBright: init(102, 49),
  bgYellowBright: init(103, 49),
  bgBlueBright: init(104, 49),
  bgMagentaBright: init(105, 49),
  bgCyanBright: init(106, 49),
  bgWhiteBright: init(107, 49),

  // Extended 256-color palette - Popular colors
  orange: init256Color(208),
  purple: init256Color(129),
  pink: init256Color(207),
  lime: init256Color(154),
  teal: init256Color(37),
  indigo: init256Color(54),
  brown: init256Color(130),
  olive: init256Color(142),
  navy: init256Color(17),
  maroon: init256Color(52),
  silver: init256Color(248),
  gold: init256Color(220),
  bgOrange: init256Color(208, true),
  bgPurple: init256Color(129, true),
  bgPink: init256Color(207, true),
  bgLime: init256Color(154, true),
  bgTeal: init256Color(37, true),
  bgIndigo: init256Color(54, true),
  bgBrown: init256Color(130, true),
  bgOlive: init256Color(142, true),
  bgNavy: init256Color(17, true),
  bgMaroon: init256Color(52, true),
  bgSilver: init256Color(248, true),
  bgGold: init256Color(220, true),
};

export const RAND_COLOR_LIST = Object.keys(colorDefs).filter(v => {
  if (v.startsWith('bg')) return false;
  if (
    [
      'reset',
      'bold',
      'dim',
      'italic',
      'underline',
      'inverse',
      'hidden',
      'strikethrough',
      'black',
      'white',
      'gray',
    ].includes(v)
  )
    return false;

  return true;
}) as Readonly<ColorName[]>;

export type ColorName = keyof typeof colorDefs;
export type ColorFunction = (text: string | number) => string;

/**
 * Creates an object that maps colour names to their respective colour functions,
 * based on whether or not colour support is enabled.
 * @param {boolean} [useColor=isColorSupported] - Specifies whether to use colour functions or fallback to plain strings.
 * @returns {Record<ColorName, ColorFunction>} An object where keys are colour names and values are functions to apply those colours. See {@link ColorFunction}.
 */
function createColors(useColor = isColorSupported) {
  return useColor
    ? colorDefs
    : Object.fromEntries(Object.keys(colorDefs).map(key => [key, String]));
}

/**
 * An object containing functions for colouring text. Each function corresponds to a terminal colour. See {@link ColorName} for available colours.
 */
export const colors = createColors() as Record<ColorName, ColorFunction>;

/**
 * Gets a colour function by name, with an option for a fallback colour if the requested colour is not found.
 * @param {ColorName} color - The name of the colour function to get. See {@link ColorName}.
 * @param {ColorName} [fallback="reset"] - The name of the fallback colour function if the requested colour is not found. See {@link ColorName}.
 * @returns {ColorFunction} The colour function that corresponds to the requested colour, or the fallback colour function. See {@link ColorFunction}.
 */
export function getColor(
  color: ColorName,
  fallback: ColorName = 'reset',
): ColorFunction {
  return colors[color] || colors[fallback];
}

/**
 * Applies a specified colour to a given text string or number.
 * @param {ColorName} color - The colour to apply. See {@link ColorName}.
 * @param {string | number} text - The text to colour.
 * @returns {string} The coloured text.
 */
export function colorize(color: ColorName, text: string | number): string {
  return getColor(color)(text);
}
