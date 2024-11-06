import { isNumber } from './is';
import { round2digits } from './num/round2digits';

type Dict<T> = { [key: string]: T | undefined };

type ListTypeName = 'bool' | 'int' | 'decimal' | 'string';

type ListTypeNameToType<T extends ListTypeName> = T extends 'bool'
  ? boolean
  : T extends 'int'
    ? number
    : T extends 'decimal'
      ? number
      : T extends 'string'
        ? string
        : never;

/**
 * Environment variable parser
 *
 * @group Environment
 */
export interface EnvParser {
  /**
   * NODE_ENV is `development`
   */
  isDevelopment: boolean;

  /**
   * NODE_ENV is `production`
   */
  isProduction: boolean;

  /**
   * NODE_ENV is `stage`
   */
  isStage: boolean;

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
  decimal(key: string, dights?: number, defaultValue?: number): number;

  /**
   * Returns `string` when environment key has defined.
   *
   * Returns `defaultValue` when environment key is not defined
   */
  string(key: string, defaultValue?: string): string;

  /**
   * Returns `array` of parsed environment value.
   *
   * Returns `defaultValue` when key is not defined
   */
  list<T extends ListTypeName>(
    key: string,
    itemType: T,
    defaultValue?: ListTypeNameToType<T>[],
  ): ListTypeNameToType<T>[];

  /**
   * Returns parsed json value.
   *
   * Returns `defaultValue` when key is not defined or invalid json value
   */
  json<T = any>(key: string, defaultValue?: T | null): T | null;
}

/**
 * Ready-to-use environment parser.
 *
 * Target: `process.env`
 *
 * Fallback: `import.meta.env`
 *
 * @example
 *
 * // env.string
 * const API_KEY = env.string('API_KEY', 'test_key');
 *
 * // env.bool
 * const TEST_FEATURE = env.bool('TEST_FEATURE', false);
 *
 * // env.int
 * const RETRY_ATTEMPTS = env.int('RETRY_ATTEMPTS', 5);
 *
 * // env.decimal
 * const DELAY_SECONDS = env.decimal('DELAY_SECONDS', 2, 5); // round to 2 dights
 *
 * // env.list
 * const TARGET_ROLES = env.list('TARGET_ROLES', 'string', ['ADMIN']);
 *
 * // env.json
 * const GOOGLE_CREDS = env.json<{ projectId: string; token: string; }>('GOOGLE_CREDS');
 *
 * @group Environment
 */
export const env: Readonly<EnvParser> = (() => {
  if ((globalThis as any)?.process) {
    return createEnvParser(process.env);
  } else {
    return createEnvParser((import.meta as any).env);
  }
})();

/**
 * @example
 * const env = createEnvParser(process.env);
 * // const env = createEnvParser(import.meta.env);
 *
 * const API_KEY = env.string('API_KEY', 'test_key');
 *
 * @group Environment
 */
export function createEnvParser(
  targetObject: Record<string, string> | Dict<string>,
): Readonly<EnvParser> {
  return Object.freeze({
    isDevelopment: targetObject.NODE_ENV === 'development',

    isProduction: targetObject.NODE_ENV === 'production',

    isStage: targetObject.NODE_ENV === 'state',

    isTest: targetObject.NODE_ENV === 'test',

    bool(key: string, defaultValue: boolean = false): boolean {
      if (!(key in targetObject)) {
        return defaultValue;
      }

      return parseBoolean(targetObject[key]) ?? defaultValue;
    },

    int(key: string, defaultValue: number = 0): number {
      if (!(key in targetObject)) {
        return defaultValue;
      }

      return _parseInt(targetObject[key]) ?? defaultValue;
    },

    decimal(key: string, dights = undefined, defaultValue: number = 0): number {
      if (!(key in targetObject)) {
        return isNumber(dights)
          ? round2digits(defaultValue, dights)
          : defaultValue;
      }

      return parseDecimal(targetObject[key], dights) ?? defaultValue;
    },

    string(key: string, defaultValue: string = ''): string {
      return targetObject[key] || defaultValue;
    },

    list<T extends ListTypeName>(
      key: string,
      type: T,
      defaultValue: ListTypeNameToType<T>[] = [],
    ): ListTypeNameToType<T>[] {
      if (!(key in targetObject)) {
        return defaultValue;
      }

      const parsers: Record<ListTypeName, (value: unknown) => any> = {
        int: _parseInt,
        bool: parseBoolean,
        decimal: v => parseDecimal(v, 2),
        string: v => v,
      };

      return ((targetObject as any)[key] as string)
        .split(',')
        .map((value, idx) => {
          const parsedValue = parsers[type](value.trim());

          if (parsedValue === undefined) {
            console.warn('Warn! Failed to parse list item as ' + type, {
              key,
              idx,
              type,
              value,
            });
          }

          return parsedValue;
        })
        .filter(v => v !== undefined);
    },

    json<T = any>(key: string, defaultValue: T | null = null): T | null {
      if (!(key in targetObject)) {
        return defaultValue;
      }

      try {
        // @ts-expect-error
        return JSON.parse(targetObject[key]);
      } catch (err) {
        console.warn('Failed to parse json env variable', key);
        return defaultValue;
      }
    },
  });
}

function parseBoolean(value: unknown): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;

  return undefined;
}

function _parseInt(value: unknown): number | undefined {
  const parsed = parseInt(value as any);

  return isNumber(parsed) ? parsed : undefined;
}

function parseDecimal(value: unknown, dights?: number): number | undefined {
  const parsed = parseFloat(value as any);

  return isNumber(parsed)
    ? isNumber(dights)
      ? round2digits(parsed, dights)
      : parsed
    : undefined;
}
