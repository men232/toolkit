import { isDate, isFunction, isNumber } from '@/is';
import {
  arrayTag,
  bigintTag,
  booleanTag,
  dateTag,
  functionTag,
  getTag,
  mapTag,
  nullTag,
  numberTag,
  objectTag,
  setTag,
  stringTag,
  symbolTag,
  undefinedTag,
  weakmapTag,
  weaksetTag,
} from '@/object/getTag';
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
  [nullTag]: 'null',
  [undefinedTag]: 'undefined',
  [stringTag]: 'string',
  [functionTag]: 'function',
  [arrayTag]: 'array',
  [setTag]: 'set',
  [mapTag]: 'map',
  [dateTag]: v => (isDate(v) ? 'date' : 'unknown'),
  [objectTag]: 'object',
  [symbolTag]: 'symbol',
  [bigintTag]: 'bigint',
  [booleanTag]: 'boolean',
  [weakmapTag]: 'weakmap',
  [weaksetTag]: 'weakset',
  [numberTag]: v => (isNumber(v) ? 'number' : 'unknown'),
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
