import type { Arrayable } from '@andrew_l/toolkit';
import type { StringWidth } from '@cto.af/string-width';
import type { ColorName } from './utils/getColor.js';

export type LevelConfig = {
  /**
   * Icon symbol displayed before the log message.
   * @example '🔥' - Fire emoji for error level
   * @example '✅' - Checkmark for success level
   */
  icon: string;

  color: ColorValue;

  /**
   * Level badge name displayed in log output.
   * Typically uppercase abbreviation of the level name.
   * @example 'INFO' - Information level
   * @example 'ERROR' - Error level
   * @example 'WARN' - Warning level
   */
  badge: string;
};

export type TypeConfig = {
  color: ColorValue;
};

export interface PrettyOptions {
  /**
   * Pino message key.
   * @default 'regular'
   */
  inspect: 'regular' | 'compact' | InspectFunction;

  /**
   * Pino message key.
   */
  messageKey: string;

  /**
   * Pino nested key.
   */
  nestedKey?: string;

  /**
   * The maximum number of columns to output, affects formatting and line wrapping.
   * Should typically match the terminal width for optimal display.
   * @example process.stdout.columns
   * @default 80
   */
  columns: number;

  /**
   * Quote style for string values in log output.
   * @default 'single'
   * @example 'single' - Uses single quotes: 'hello world'
   * @example 'double' - Uses double quotes: "hello world"
   */
  quoteStyle: 'single' | 'double';

  /**
   * Comma-separated list of log message fields to ignore/hide from output.
   * Useful for reducing noise by hiding standard fields like hostname or PID.
   * @example 'time,name' - Hides timestamp and logger name
   * @default 'hostname,pid'
   */
  ignore: string;

  /**
   * Number of spaces to use for indentation when formatting nested objects.
   * @default 2
   */
  indent: number;

  /**
   * Maximum depth to recurse when formatting nested objects and arrays.
   * @default 5
   */
  depth: number;

  /**
   * Minimum log level value at which to show the level badge.
   * Levels below this threshold will not display their badge text.
   * @default 40
   * @example 30 - Show badges for levels 30 and above (info, warn, error, fatal)
   * @example 50 - Show badges only for levels 50 and above (error, fatal)
   */
  badgeMinLevel: number;

  /**
   * Maximum length for string values before they are truncated with ellipsis.
   * @default 400
   */
  maxStringLength: number;

  /**
   * When enabled, formats numbers like 1234567 as 1_234_567.
   * @default false
   */
  numericSeparator: boolean;

  /**
   * Whether to use ANSI colors in the output.
   * @default true
   */
  colorize: boolean;

  /**
   * Configuration mapping for log levels.
   */
  levels: Record<number, LevelConfig>;

  /**
   * Configuration mapping for data types.
   */
  types: Record<TypeName, TypeConfig>;
}

export type TypeName =
  | 'number'
  | 'boolean'
  | 'string'
  | 'object'
  | 'error'
  | 'errorStack'
  | 'time'
  | 'name';

export type PrettyOptionsParsed = Omit<
  PrettyOptions,
  'levels' | 'types' | 'ignore'
> & {
  sw: StringWidth;
  ignore: Set<string>;
  ignoreAdditional: Set<string>;
  levels: Record<number, LevelConfigParsed>;
  types: Record<string, TypeConfigParsed>;
  inspectFn: InspectFunction;
  inspectOptions: InspectOptions;
  colorFallback: ColorizeFn;
};

/**
 * Color configuration.
 * Can be a single color name, array of color names, or 'rand' for random colors.
 */
export type ColorValue = 'rand' | Arrayable<ColorName>;

export type ColorizeFn = (value: string) => string;

export type LevelConfigParsed = Omit<LevelConfig, 'color'> & {
  color: ColorizeFn;
  colorBadge: ColorizeFn;
};

export type TypeConfigParsed = Omit<TypeConfig, 'color'> & {
  color: ColorizeFn;
};

export interface LogObject {
  level: number;
  time: number;
  msg: string;
  pid?: number;
  hostname?: string;
  [key: string]: any;
}

export type InspectFunction = (obj: any, opts: InspectOptions) => string;

export interface InspectOptions {
  /** Maximum depth of the inspection @default 5 */
  depth: number;
  /** Quote style for strings @default 'single' */
  quoteStyle: 'single' | 'double';
  /** Maximum string length before truncation @default Infinity */
  maxStringLength: number;
  /** Indentation spaces @default 2 */
  indent: number;
  /** Add numeric separators (1_234.567_8) @default false */
  numericSeparator: boolean;
  /** Custom stringify functions for different types */
  customStringify: {
    [x: string]: InspectCustomStringify;
  };
  /** Available width columns */
  columns: number;
}

type InspectCustomStringify = (value: any) => string;
