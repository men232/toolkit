import { isBuffer, isPrimitive, isTypedArray } from '@/is';
import {
  argumentsTag,
  arrayBufferTag,
  arrayTag,
  booleanTag,
  dataViewTag,
  dateTag,
  float32ArrayTag,
  float64ArrayTag,
  getTag,
  int16ArrayTag,
  int32ArrayTag,
  int8ArrayTag,
  mapTag,
  numberTag,
  objectTag,
  regexpTag,
  setTag,
  stringTag,
  symbolTag,
  uint16ArrayTag,
  uint32ArrayTag,
  uint8ArrayTag,
  uint8ClampedArrayTag,
} from '../getTag';
import type { WithCustomizer } from './deepCloneWith';

export function deepCloneWithImpl<T>(
  valueToClone: any,
  keyToClone: PropertyKey | undefined,
  objectToClone: T,
  stack = new Map<any, any>(),
  cloneValue: WithCustomizer<T> | undefined = undefined,
): T {
  const cloned = cloneValue?.(valueToClone, keyToClone, objectToClone, stack);

  if (cloned !== undefined) {
    return cloned;
  }

  if (isPrimitive(valueToClone)) {
    return valueToClone as T;
  }

  if (stack.has(valueToClone)) {
    return stack.get(valueToClone) as T;
  }

  if (Array.isArray(valueToClone)) {
    const result: any = new Array(valueToClone.length);
    stack.set(valueToClone, result);

    for (let i = 0; i < valueToClone.length; i++) {
      result[i] = deepCloneWithImpl(
        valueToClone[i],
        i,
        objectToClone,
        stack,
        cloneValue,
      );
    }

    // For RegExpArrays
    if (Object.hasOwn(valueToClone, 'index')) {
      result.index = (valueToClone as any).index;
    }
    if (Object.hasOwn(valueToClone, 'input')) {
      result.input = (valueToClone as any).input;
    }

    return result as T;
  }

  if (valueToClone instanceof Date) {
    return new Date(valueToClone.getTime()) as T;
  }

  if (valueToClone instanceof RegExp) {
    const result = new RegExp(valueToClone.source, valueToClone.flags);

    result.lastIndex = valueToClone.lastIndex;

    return result as T;
  }

  if (valueToClone instanceof Map) {
    const result = new Map();
    stack.set(valueToClone, result);

    for (const [key, value] of valueToClone) {
      result.set(
        key,
        deepCloneWithImpl(value, key, objectToClone, stack, cloneValue),
      );
    }

    return result as T;
  }

  if (valueToClone instanceof Set) {
    const result = new Set();
    stack.set(valueToClone, result);

    for (const value of valueToClone) {
      result.add(
        deepCloneWithImpl(value, undefined, objectToClone, stack, cloneValue),
      );
    }

    return result as T;
  }

  if (isBuffer(valueToClone)) {
    return (valueToClone as any).subarray() as T;
  }

  if (isTypedArray(valueToClone)) {
    const result = new (Object.getPrototypeOf(valueToClone).constructor)(
      valueToClone.length,
    );
    stack.set(valueToClone, result);

    for (let i = 0; i < valueToClone.length; i++) {
      result[i] = deepCloneWithImpl(
        valueToClone[i],
        i,
        objectToClone,
        stack,
        cloneValue,
      );
    }

    return result as T;
  }

  if (
    valueToClone instanceof ArrayBuffer ||
    (typeof SharedArrayBuffer !== 'undefined' &&
      valueToClone instanceof SharedArrayBuffer)
  ) {
    return valueToClone.slice(0) as T;
  }

  if (valueToClone instanceof DataView) {
    const result = new DataView(
      valueToClone.buffer.slice(0),
      valueToClone.byteOffset,
      valueToClone.byteLength,
    );
    stack.set(valueToClone, result);

    copyProperties(result, valueToClone, objectToClone, stack, cloneValue);

    return result as T;
  }

  // For legacy NodeJS support
  if (typeof File !== 'undefined' && valueToClone instanceof File) {
    const result = new File([valueToClone], valueToClone.name, {
      type: valueToClone.type,
    });
    stack.set(valueToClone, result);

    copyProperties(result, valueToClone, objectToClone, stack, cloneValue);

    return result as T;
  }

  // For environments that don't support Blob, like mini-programs
  if (typeof Blob !== 'undefined' && valueToClone instanceof Blob) {
    const result = new Blob([valueToClone], { type: valueToClone.type });
    stack.set(valueToClone, result);

    copyProperties(result, valueToClone, objectToClone, stack, cloneValue);

    return result as T;
  }

  if (valueToClone instanceof Error) {
    const result = structuredClone(valueToClone) as Error;
    stack.set(valueToClone, result);

    result.message = valueToClone.message;
    result.name = valueToClone.name;
    result.stack = valueToClone.stack;
    result.cause = valueToClone.cause;
    result.constructor = valueToClone.constructor;

    copyProperties(result, valueToClone, objectToClone, stack, cloneValue);

    return result as T;
  }

  if (valueToClone instanceof Boolean) {
    const result = new Boolean(valueToClone.valueOf()) as T;
    stack.set(valueToClone, result);
    copyProperties(result, valueToClone, objectToClone, stack, cloneValue);
    return result;
  }

  if (valueToClone instanceof Number) {
    const result = new Number(valueToClone.valueOf()) as T;
    stack.set(valueToClone, result);
    copyProperties(result, valueToClone, objectToClone, stack, cloneValue);
    return result;
  }

  if (valueToClone instanceof String) {
    const result = new String(valueToClone.valueOf()) as T;
    stack.set(valueToClone, result);
    copyProperties(result, valueToClone, objectToClone, stack, cloneValue);
    return result;
  }

  if (typeof valueToClone === 'object' && isCloneableObject(valueToClone)) {
    const result = Object.create(Object.getPrototypeOf(valueToClone));

    stack.set(valueToClone, result);

    copyProperties(result, valueToClone, objectToClone, stack, cloneValue);

    return result as T;
  }

  return valueToClone;
}

function copyProperties<T>(
  target: any,
  source: any,
  objectToClone: T = target,
  stack?: Map<any, any> | undefined,
  cloneValue?: WithCustomizer<T>,
) {
  const keys = [...Object.keys(source), ...getSymbols(source)];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const descriptor = Object.getOwnPropertyDescriptor(target, key);

    if (descriptor == null || descriptor.writable) {
      target[key] = deepCloneWithImpl(
        source[key],
        key,
        objectToClone,
        stack,
        cloneValue,
      );
    }
  }
}

function isCloneableObject(object: object) {
  switch (getTag(object)) {
    case argumentsTag:
    case arrayTag:
    case arrayBufferTag:
    case dataViewTag:
    case booleanTag:
    case dateTag:
    case float32ArrayTag:
    case float64ArrayTag:
    case int8ArrayTag:
    case int16ArrayTag:
    case int32ArrayTag:
    case mapTag:
    case numberTag:
    case objectTag:
    case regexpTag:
    case setTag:
    case stringTag:
    case symbolTag:
    case uint8ArrayTag:
    case uint8ClampedArrayTag:
    case uint16ArrayTag:
    case uint32ArrayTag: {
      return true;
    }
    default: {
      return false;
    }
  }
}
function getSymbols(object: any) {
  return Object.getOwnPropertySymbols(object).filter(symbol =>
    Object.prototype.propertyIsEnumerable.call(object, symbol),
  );
}
