import { filterMap } from '@/array/filterMap';
import { EJSON } from '@/ejson';
import { isNumber } from '@/is';
import { round2digits } from '@/num/round2digits';
import type { Logger } from '@/types';

type Dict<T> = { [key: string]: T | undefined };

/**
 * Environment variables source, e.g. `process.env` or `import.meta.env`.
 *
 * @group Environment
 */
export type EnvTarget = Record<string, string> | Dict<string>;

type ListTypeMap = {
  bool: boolean;
  int: number;
  decimal: number;
  string: string;
};

type ListTypeName = keyof ListTypeMap;

type ListTypeNameToType<T extends ListTypeName> = ListTypeMap[T];

/**
 * Parses one raw environment value. Signals failure by returning `undefined`
 * or throwing.
 *
 * @group Environment
 */
export type EnvValueParser<T> = (value: string) => T | undefined;

/**
 * Environment variable parser
 *
 * @group Environment
 */
export interface EnvParser {
  /**
   * `true` when `NODE_ENV`, or Vite `MODE` without it, is `development`.
   */
  readonly isDevelopment: boolean;

  /**
   * `true` when `NODE_ENV`, or Vite `MODE` without it, is `production`.
   */
  readonly isProduction: boolean;

  /**
   * `true` when `NODE_ENV`, or Vite `MODE` without it, is `stage`.
   */
  readonly isStage: boolean;

  /**
   * `true` when `NODE_ENV`, or Vite `MODE` without it, is `test`.
   */
  readonly isTest: boolean;

  /**
   * Reads a boolean: `"true"` or `"false"`.
   *
   * @param key - Environment variable name.
   * @param [defaultValue=false] - Returned when the value is missing, empty or invalid.
   * @returns The parsed boolean or `defaultValue`.
   *
   * @example
   * const DEBUG = env.bool('DEBUG');
   */
  bool(key: string, defaultValue?: boolean): boolean;

  /**
   * Reads a safe integer.
   *
   * @param key - Environment variable name.
   * @param [defaultValue=0] - Returned when the value is missing, empty or invalid.
   * @returns The parsed integer or `defaultValue`.
   *
   * @example
   * const PORT = env.int('PORT', 3000);
   */
  int(key: string, defaultValue?: number): number;

  /**
   * Reads a number, including `Infinity`.
   *
   * @param key - Environment variable name.
   * @param [digits] - Decimal places to round to, applied to `defaultValue` as well.
   * @param [defaultValue=0] - Returned when the value is missing, empty or invalid.
   * @returns The parsed number or `defaultValue`, rounded to `digits` when given.
   *
   * @example
   * const RATIO = env.decimal('RATIO', 2, 0.5);
   */
  decimal(key: string, digits?: number, defaultValue?: number): number;

  /**
   * Reads a raw string. The value is not trimmed and an empty value is returned as is.
   *
   * @param key - Environment variable name.
   * @param [defaultValue=''] - Returned when the key is missing.
   * @returns The raw value or `defaultValue`.
   *
   * @example
   * const API_KEY = env.string('API_KEY', 'test_key');
   */
  string(key: string, defaultValue?: string): string;

  /**
   * Reads a comma-separated list. Empty items are dropped, items that fail to
   * parse are skipped with a warning.
   *
   * @param key - Environment variable name.
   * @param itemType - Item type name, allowed values or item parser.
   * @param [defaultValue=[]] - Returned when the key is missing or no item could be parsed.
   * @returns The parsed items, `[]` when the value has no items (e.g. `""` or `" , "`), or `defaultValue`.
   *
   * @example
   * env.list('ROLES', 'string');                        // string[]
   * env.list('PORTS', 'int');                           // number[]
   * env.list('LEVELS', ['debug', 'info'] as const);     // ('debug' | 'info')[]
   * env.list('ORIGINS', value => new URL(value));       // URL[]
   */
  list<T extends ListTypeName>(
    key: string,
    itemType: T,
    defaultValue?: ListTypeNameToType<T>[],
  ): ListTypeNameToType<T>[];
  list<const V extends readonly string[]>(
    key: string,
    allowedValues: V,
    defaultValue?: V[number][],
  ): V[number][];
  list<T>(key: string, parser: EnvValueParser<T>, defaultValue?: T[]): T[];

  /**
   * Reads a JSON value.
   *
   * @param key - Environment variable name.
   * @param [defaultValue=null] - Returned when the value is missing, empty or invalid.
   * @returns The parsed value or `defaultValue`.
   *
   * @example
   * const CREDS = env.json<{ token: string }>('CREDS');
   */
  json<T = any>(key: string, defaultValue: T): T;
  json<T = any>(key: string, defaultValue?: T | null): T | null;

  /**
   * Reads one of `allowedValues`, typed as their union.
   *
   * @param key - Environment variable name.
   * @param allowedValues - Accepted values.
   * @param [defaultValue] - Returned when the value is missing, empty or not listed.
   * @returns The matched value or `defaultValue`.
   *
   * @example
   * const level = env.oneOf('LOG_LEVEL', ['debug', 'info', 'warn'], 'info');
   * // level: 'debug' | 'info' | 'warn'
   */
  oneOf<const T extends readonly string[], D = undefined>(
    key: string,
    allowedValues: T,
    defaultValue?: D,
  ): T[number] | D;

  /**
   * Reads a value through a custom parser.
   *
   * @param key - Environment variable name.
   * @param parser - Signals failure by returning `undefined` or throwing.
   * @param [defaultValue] - Returned when the value is missing, empty or fails to parse.
   * @returns The parsed value or `defaultValue`.
   *
   * @example
   * const url = env.parse('DATABASE_URL', value => new URL(value));
   */
  parse<T, D = undefined>(
    key: string,
    parser: EnvValueParser<T>,
    defaultValue?: D,
  ): T | D;
}

/**
 * @group Environment
 */
export interface EnvParserOptions {
  /**
   * Receives `printf`-style warnings whenever a value cannot be parsed.
   * Without a logger such failures are silent.
   */
  logger?: Logger;
}

/**
 * @example
 * const env = createEnvParser(process.env, { logger: logger('env') });
 * // const env = createEnvParser(import.meta.env);
 *
 * const API_KEY = env.string('API_KEY', 'test_key');
 *
 * @group Environment
 */
export function createEnvParser(
  targetObject: EnvTarget,
  options?: EnvParserOptions,
): Readonly<EnvParser> {
  var log = options?.logger;

  var read = (key: string): string | undefined => {
    if (!Object.hasOwn(targetObject, key)) {
      return undefined;
    }

    var value: unknown = targetObject[key];

    if (typeof value === 'string') {
      return value;
    }

    return value == null ? undefined : String(value);
  };

  var nodeEnv = () => read('NODE_ENV')?.trim() || read('MODE')?.trim();

  /**
   * Shared read-parse-fallback path. `parser` signals failure by returning
   * `undefined` or throwing.
   */
  var parseValue = <T, D>(
    key: string,
    type: string,
    parser: EnvValueParser<T>,
    defaultValue: D,
  ): T | D => {
    var value = read(key)?.trim();

    if (!value) {
      return defaultValue;
    }

    var parsed = tryParse(parser, value);

    if (parsed === undefined) {
      log?.warn('Failed to parse env variable as "%s": %s', type, key);
      return defaultValue;
    }

    return parsed;
  };

  return Object.freeze({
    get isDevelopment() {
      return nodeEnv() === 'development';
    },

    get isProduction() {
      return nodeEnv() === 'production';
    },

    get isStage() {
      return nodeEnv() === 'stage';
    },

    get isTest() {
      return nodeEnv() === 'test';
    },

    bool(key: string, defaultValue: boolean = false): boolean {
      return parseValue(key, 'bool', parseBoolean, defaultValue);
    },

    int(key: string, defaultValue: number = 0): number {
      return parseValue(key, 'int', _parseInt, defaultValue);
    },

    decimal(key: string, digits?: number, defaultValue: number = 0): number {
      if (isNumber(digits)) {
        defaultValue = round2digits(defaultValue, digits);
      }

      return parseValue(
        key,
        'decimal',
        value => parseDecimal(value, digits),
        defaultValue,
      );
    },

    string(key: string, defaultValue: string = ''): string {
      return read(key) ?? defaultValue;
    },

    list(
      key: string,
      itemType: ListTypeName | readonly string[] | EnvValueParser<any>,
      defaultValue: any[] = [],
    ): any[] {
      var rawValue = read(key);

      if (rawValue === undefined) {
        return defaultValue;
      }

      var type: string;
      var parse: EnvValueParser<any>;

      if (typeof itemType === 'string') {
        type = itemType;
        parse = LIST_ITEM_PARSERS[itemType];
      } else if (typeof itemType === 'function') {
        type = 'custom';
        parse = itemType;
      } else {
        type = 'oneOf';
        parse = createOneOfParser(itemType);
      }

      var hasItems = false;
      var items = filterMap<string, any>(
        rawValue.split(','),
        (value, skip, idx) => {
          var trimmedValue = value.trim();

          if (!trimmedValue) {
            return skip;
          }

          hasItems = true;
          var parsedValue = tryParse(parse, trimmedValue);

          if (parsedValue === undefined) {
            log?.warn(
              'Failed to parse env list item as "%s": %s[%d]',
              type,
              key,
              idx,
            );

            return skip;
          }

          return parsedValue;
        },
      );

      return items.length || !hasItems ? items : defaultValue;
    },

    json<T = any>(key: string, defaultValue: T | null = null): T | null {
      return parseValue(key, 'json', parseJson<T>, defaultValue);
    },

    oneOf<const T extends readonly string[], D = undefined>(
      key: string,
      allowedValues: T,
      defaultValue?: D,
    ): T[number] | D {
      return parseValue(
        key,
        'oneOf',
        createOneOfParser(allowedValues),
        defaultValue as D,
      );
    },

    parse<T, D = undefined>(
      key: string,
      parser: EnvValueParser<T>,
      defaultValue?: D,
    ): T | D {
      return parseValue(key, 'custom', parser, defaultValue as D);
    },
  });
}

var LIST_ITEM_PARSERS: {
  [K in ListTypeName]: (value: string) => ListTypeMap[K] | undefined;
} = {
  bool: parseBoolean,
  int: _parseInt,
  decimal: value => parseDecimal(value),
  string: value => value,
};

function tryParse<T>(parser: EnvValueParser<T>, value: string): T | undefined {
  try {
    return parser(value);
  } catch {
    return undefined;
  }
}

function createOneOfParser<V extends readonly string[]>(
  allowedValues: V,
): EnvValueParser<V[number]> {
  return value =>
    (allowedValues as readonly string[]).includes(value) ? value : undefined;
}

function parseJson<T>(value: string): T {
  return EJSON.parse<T>(value);
}

function parseBoolean(value: string): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;

  return undefined;
}

function _parseInt(value: string): number | undefined {
  var parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function parseDecimal(value: string, digits?: number): number | undefined {
  var parsed = Number(value);

  if (!isNumber(parsed)) {
    return undefined;
  }

  // Rounding is only meaningful for finite values; `Infinity` passes through.
  return isNumber(digits) && Number.isFinite(parsed)
    ? round2digits(parsed, digits)
    : parsed;
}
