import { isDate, isFunction, isNumber } from '@/is';
import { getTag } from '@/object/getTag';
import type { AnyFunction } from '../../types';

export type TypeOf = keyof TypeOfMap;

export type TypeOfMap = {
  null: null;
  undefined: undefined;
  object: Record<PropertyKey, any>;
  string: string;
  number: number;
  function: AnyFunction;
  bigint: bigint;
  boolean: boolean;
  symbol: symbol;
  date: Date;
  array: any[];
  map: Map<any, any>;
  weakmap: WeakMap<WeakKey, any>;
  set: Set<any>;
  weakset: WeakSet<WeakKey>;
  unknown: unknown;
};

var tagToType: Record<string, TypeOf | ((value: unknown) => TypeOf)> = {
  '[object Null]': 'null',
  '[object Undefined]': 'undefined',
  '[object String]': 'string',
  '[object Function]': 'function',
  '[object Array]': 'array',
  '[object Set]': 'set',
  '[object Map]': 'map',
  '[object Date]': v => (isDate(v) ? 'date' : 'unknown'),
  '[object Object]': 'object',
  '[object Symbol]': 'symbol',
  '[object BigInt]': 'bigint',
  '[object Boolean]': 'boolean',
  '[object WeakMap]': 'weakmap',
  '[object WeakSet]': 'weakset',
  '[object Number]': v => (isNumber(v) ? 'number' : 'unknown'),
};

/**
 * Typeof that you deserve
 * @group Utility Functions
 */
export function typeOf(value: unknown): TypeOf {
  var typeOrGetter = tagToType[getTag(value)] || 'unknown';

  if (isFunction(typeOrGetter)) {
    return typeOrGetter(value);
  }

  return typeOrGetter;
}
