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
   * NODE_ENV is `development`
   */
  readonly isDevelopment: boolean;

  /**
   * NODE_ENV is `production`
   */
  readonly isProduction: boolean;

  /**
   * NODE_ENV is `stage`
   */
  readonly isStage: boolean;

  /**
   * NODE_ENV is `test`
   */
  readonly isTest: boolean;

  /**
   * Returns `true` when environment key has set to `"true"`
   *
   * Returns `defaultValue` when key is not defined
   */
  bool(key: string, defaultValue?: boolean): boolean;

  /**
   * Returns `number` when environment key has correct number value.
   *
   * Returns `defaultValue` when environment key is not defined or has invalid number value
   */
  int(key: string, defaultValue?: number): number;

  /**
   * Returns `number` when environment key has correct number value.
   *
   * Returns `defaultValue` when environment key is not defined or has invalid number value
   */
  decimal(key: string, digits?: number, defaultValue?: number): number;

  /**
   * Returns `string` when environment key has defined.
   *
   * Returns `defaultValue` when environment key is not defined
   */
  string(key: string, defaultValue?: string): string;

  /**
   * Returns `array` of parsed comma-separated environment value. Items that
   * fail to parse are skipped with a warning.
   *
   * Returns `defaultValue` when key is not defined or no item could be parsed
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
   * Returns parsed json value.
   *
   * Returns `defaultValue` when key is not defined or invalid json value
   */
  json<T = any>(key: string, defaultValue?: T | null): T | null;

  /**
   * Returns the environment value when it is one of `allowedValues`, typed as their
   * union.
   *
   * Returns `defaultValue` when key is not defined or the value is not listed
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
   * Returns the result of `parser` applied to the environment value.
   *
   * Returns `defaultValue` when key is not defined, or when `parser` returns
   * `undefined` or throws
   *
   * @example
   * const url = env.parse('DATABASE_URL', value => new URL(value));
   * const port = env.parse('PORT', Number, 3000);
   */
  parse<T, D = undefined>(
    key: string,
    parser: (value: string) => T | undefined,
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

  /**
   * An empty value is how `.env` templates spell "unset", so only non-empty
   * values that fail to parse are worth a warning.
   */
  var warnInvalid = (type: string, key: string, value: string) => {
    if (value) {
      log?.warn('Failed to parse env variable as "%s": %s', type, key);
    }
  };

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
    var value = read(key);

    if (value === undefined) {
      return defaultValue;
    }

    var parsed = tryParse(parser, value);

    if (parsed === undefined) {
      warnInvalid(type, key, value);
      return defaultValue;
    }

    return parsed;
  };

  return Object.freeze({
    get isDevelopment() {
      return targetObject.NODE_ENV === 'development';
    },

    get isProduction() {
      return targetObject.NODE_ENV === 'production';
    },

    get isStage() {
      return targetObject.NODE_ENV === 'stage';
    },

    get isTest() {
      return targetObject.NODE_ENV === 'test';
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

      // No outer trim: blank input yields only skipped items and falls back
      // to `defaultValue` below, so trimming the whole string is wasted work.
      if (!rawValue) {
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

      var items = filterMap<string, any>(
        rawValue.split(','),
        (value, skip, idx) => {
          var trimmedValue = value.trim();

          if (!trimmedValue) {
            return skip;
          }

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

      return items.length ? items : defaultValue;
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
      parser: (value: string) => T | undefined,
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
  var parsed = parseInt(value);
  return isNumber(parsed) ? parsed : undefined;
}

function parseDecimal(value: string, digits?: number): number | undefined {
  var parsed = parseFloat(value);

  if (!isNumber(parsed)) {
    return undefined;
  }

  // Rounding is only meaningful for finite values; `Infinity` passes through.
  return isNumber(digits) && Number.isFinite(parsed)
    ? round2digits(parsed, digits)
    : parsed;
}
