import {
  isDate,
  isEmpty,
  isEqual,
  isFunction,
  isNumber,
  isObject,
  isString,
} from './is.js';
import { deepAssign } from './object/index.js';
import { type TypeOf, type TypeOfMap, typeOf } from './typeOf.js';

type StringifyOptions = {
  /**
   * Exclude empty values, checking by `isEmpty`
   * @default true
   */
  excludeEmpty?: boolean;

  /**
   * Exclude values when equals with defaults
   */
  excludeDefaults?: Record<string, any>;
};

/**
 * Simple query stringy interface that supports encoding/decoding of `Array`, `Set`, `Map`, `Object`, `BigInt`
 *
 * @example
 * // encode
 * qs.stringify({ page: 1, limit: 10 }); // 'page=1&limit=10'
 *
 * // decode
 * const defaults = { page: 1, limit: 10 };
 * const params = qs.parse('page=5&limit=abc', defaults); // { page: 5, limit: 10 }
 *
 * @group Utility Functions
 */
export const qs = {
  toParams,
  stringify,
  stringifyValue,
  parse,
  parseValue,
  merge,
};

/**
 * Merge first level values
 */
function merge(...values: Record<string, any>[]): Record<string, any> {
  const result: Record<string, any> = {};

  for (const filter of values) {
    for (const [key, value] of Object.entries(filter)) {
      const currentValue = result[key];
      const currentType = typeOf(currentValue);
      const filterType = typeOf(value);

      // overwrite with new value when type mismatch
      if (currentType !== filterType) {
        result[key] = value;
        continue;
      }

      switch (currentType) {
        case 'array': {
          result[key] = Array.from(new Set([...currentValue, ...value]));
          break;
        }

        case 'object': {
          result[key] = {};
          deepAssign(result[key], currentValue);
          deepAssign(result[key], value);
          break;
        }

        case 'map': {
          result[key] = new Map([
            ...(Array.from(currentValue.entries()) as any[]),
            ...(Array.from(value.entries()) as any[]),
          ]);
          break;
        }

        case 'set': {
          result[key] = new Set([
            ...Array.from(currentValue),
            ...Array.from(value),
          ]);
          break;
        }

        default: {
          result[key] = value;
        }
      }
    }
  }

  return result;
}

/**
 * Simple function to transform object into query string (not standards)
 */
function stringify(
  obj: Record<string, any>,
  options?: StringifyOptions,
): string {
  return new URLSearchParams(toParams(obj, options)).toString();
}

/**
 * Prepare search params object
 */
function toParams(
  obj: Record<string, any>,
  options?: StringifyOptions,
): Record<string, string> {
  const result: Record<string, string> = {};
  const excludeEmpty = options?.excludeEmpty !== false;
  const excludeDefaults = options?.excludeDefaults;

  for (const [key, value] of Object.entries(obj)) {
    if (excludeEmpty && isEmpty(value)) continue;

    if (excludeDefaults && key in excludeDefaults) {
      const defValue = excludeDefaults[key];
      if (isEqual(value, defValue)) continue;
    }

    const strValue = stringifyValue(value);

    if (excludeEmpty && strValue === '') {
      continue;
    }

    result[key] = strValue;
  }

  return result;
}

/**
 * Parse query string as is without type casting
 */
function parse(value: string): Record<string, string>;

/**
 * Parse query string and use default object as type cast schema
 */
function parse<T extends Record<string, any>>(
  value: string,
  defaults: Partial<T>,
): T;

/**
 * Parse query params and use default object as type cast schema
 */
function parse<T extends Record<string, any>>(
  value: Record<string, any>,
  defaults: T,
): Partial<T>;

function parse(
  value: string | Record<string, any>,
  defaults?: Record<string, any>,
): any {
  const objValue = isString(value)
    ? Object.fromEntries(new URLSearchParams(value).entries())
    : value;

  if (!defaults) {
    return { ...objValue };
  }

  const result: Record<string, any> = {};

  for (const [key, defValue] of Object.entries(defaults)) {
    const defType = typeOf(defValue);

    let parsedValue = parseValue(objValue[key], defType);

    if (parsedValue !== undefined || defType === 'undefined') {
      if (defType === 'array' && defValue[0] !== undefined) {
        const itemValue = typeOf(defValue[0]);
        parsedValue = (parsedValue as any[]).map(v => parseValue(v, itemValue));
      }

      result[key] = parsedValue;
    } else {
      result[key] = defValue;
    }
  }

  return result;
}

/**
 * Stringify value to use as query parameter
 */
function stringifyValue(value: unknown): string {
  const valueType = typeOf(value);

  switch (valueType) {
    case 'undefined': {
      return '';
    }

    case 'null': {
      return '';
    }

    case 'array': {
      let result = '';
      let sep = '';

      for (const item of value as any[]) {
        if (item === undefined) continue;

        if (
          isObject(item) ||
          Array.isArray(item) ||
          (isString(item) && item.includes(','))
        ) {
          result = JSON.stringify(value);
          break;
        } else {
          result += sep + stringifyValue(item);
          sep = ',';
        }
      }

      return result;
    }

    case 'date': {
      return (value as Date).toISOString();
    }

    case 'map': {
      return JSON.stringify(Array.from((value as Map<any, any>).entries()));
    }

    case 'set': {
      return JSON.stringify(Array.from((value as Set<any>).values()));
    }

    case 'boolean':
    case 'number':
    case 'string':
    case 'bigint': {
      return String(value);
    }

    case 'object': {
      return JSON.stringify(value);
    }

    case 'unknown': {
      if (isFunction(value?.toString)) {
        return value.toString();
      }
    }

    default: {
      throw new Error('Attempt to stringify unsupported type: ' + valueType);
    }
  }
}

/**
 * Parse string query value as a type
 */
function parseValue<T extends TypeOf>(
  value: any,
  asType: T,
): TypeOfMap[T] | undefined {
  const type = typeOf(value);

  if (type === asType) {
    return value;
  } else if (type !== 'string') {
    return undefined;
  }

  try {
    switch (asType) {
      case 'undefined': {
        return undefined;
      }

      case 'array': {
        if (value.startsWith('[') && value.endsWith(']')) {
          return JSON.parse(value);
        }

        return value.split(',') as any;
      }

      case 'boolean': {
        return (value === 'true') as any;
      }

      case 'date': {
        const parsed = new Date(value) as any;
        return (isDate(parsed) ? parsed : undefined) as any;
      }

      case 'map': {
        return new Map(JSON.parse(value)) as any;
      }

      case 'number': {
        const parsed = parseFloat(value);
        return (isNumber(parsed) ? parsed : undefined) as any;
      }

      case 'object': {
        return JSON.parse(value);
      }

      case 'set': {
        return new Set(JSON.parse(value)) as any;
      }

      case 'null': {
        return (value === '' || value === undefined ? null : undefined) as any;
      }

      case 'string': {
        return value as any;
      }

      case 'bigint': {
        return BigInt(value) as any;
      }
    }
  } catch (_) {}

  return undefined;
}
