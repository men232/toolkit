import {
  isDate,
  isMap,
  isNumber,
  isObject,
  isSet,
  isWeakMap,
  isWeakSet,
} from '@/is';
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

/**
 * Typeof that you deserve
 * @group Utility Functions
 */
export function typeOf(value: unknown): TypeOf {
  const type = typeof value;

  switch (type) {
    case 'number':
      return isNumber(value) ? 'number' : 'unknown';

    case 'object': {
      if (value === null) return 'null';
      if (Array.isArray(value)) return 'array';
      if (isSet(value)) return 'set';
      if (isWeakSet(value)) return 'weakset';
      if (isMap(value)) return 'map';
      if (isWeakMap(value)) return 'weakmap';
      if (isDate(value)) return 'date';
      if (isObject(value)) return 'object';
      return 'unknown';
    }

    default: {
      return type;
    }
  }
}
