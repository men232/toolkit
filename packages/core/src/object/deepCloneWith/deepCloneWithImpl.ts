import { isBuffer, isTypedArray } from '@/is';
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
  parent?: WithCustomizer.PathNode,
  cloneValue?: WithCustomizer<T>,
): T {
  if (cloneValue !== undefined) {
    const cloned = cloneValue(
      valueToClone,
      keyToClone,
      objectToClone,
      stack,
      parent,
    );

    if (cloned !== undefined) return cloned;
  }

  // Primitives and functions are returned as is.
  if (typeof valueToClone !== 'object' || valueToClone === null) {
    return valueToClone as T;
  }

  return cloneObject(
    valueToClone,
    keyToClone,
    objectToClone,
    stack,
    parent,
    cloneValue,
  );
}

/** Clones a non-null object the customizer has already seen and passed on. */
function cloneObject<T>(
  valueToClone: any,
  keyToClone: PropertyKey | undefined,
  objectToClone: T,
  stack: Map<any, any>,
  parent: WithCustomizer.PathNode | undefined,
  cloneValue: WithCustomizer<T> | undefined,
): T {
  const seen = stack.get(valueToClone);

  if (seen !== undefined) return seen as T;

  // The path node exists for the customizer alone.
  const node: WithCustomizer.PathNode | undefined =
    cloneValue === undefined
      ? undefined
      : { key: keyToClone, parent, state: undefined };

  // Plain objects and arrays are nearly everything a clone sees; they skip
  // the built-in checks below.
  const proto = Object.getPrototypeOf(valueToClone);

  if (proto === Object.prototype || proto === null) {
    const result = proto === null ? Object.create(null) : {};

    stack.set(valueToClone, result);
    copyProperties(
      result,
      valueToClone,
      objectToClone,
      stack,
      node,
      cloneValue,
      false,
    );

    return result as T;
  }

  if (Array.isArray(valueToClone)) {
    const result: any = new Array(valueToClone.length);

    stack.set(valueToClone, result);

    for (let i = 0; i < valueToClone.length; i++) {
      const item = valueToClone[i];
      const cloned =
        cloneValue === undefined
          ? undefined
          : cloneValue(item, i, objectToClone, stack, node);

      result[i] =
        cloned !== undefined
          ? cloned
          : typeof item !== 'object' || item === null
            ? item
            : cloneObject(item, i, objectToClone, stack, node, cloneValue);
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

  if (isBuffer(valueToClone)) {
    return (valueToClone as any).subarray() as T;
  }

  if (
    valueToClone instanceof ArrayBuffer ||
    (typeof SharedArrayBuffer !== 'undefined' &&
      valueToClone instanceof SharedArrayBuffer)
  ) {
    return valueToClone.slice(0) as T;
  }

  if (valueToClone instanceof Map) {
    const result = new Map();
    stack.set(valueToClone, result);

    for (const [key, value] of valueToClone) {
      result.set(
        key,
        deepCloneWithImpl(value, key, objectToClone, stack, node, cloneValue),
      );
    }

    return result as T;
  }

  if (valueToClone instanceof Set) {
    const result = new Set();
    stack.set(valueToClone, result);

    for (const value of valueToClone) {
      result.add(
        deepCloneWithImpl(
          value,
          undefined,
          objectToClone,
          stack,
          node,
          cloneValue,
        ),
      );
    }

    return result as T;
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
        node,
        cloneValue,
      );
    }

    return result as T;
  }

  if (valueToClone instanceof DataView) {
    const result = new DataView(
      valueToClone.buffer.slice(0),
      valueToClone.byteOffset,
      valueToClone.byteLength,
    );
    stack.set(valueToClone, result);

    copyProperties(
      result,
      valueToClone,
      objectToClone,
      stack,
      node,
      cloneValue,
      true,
    );

    return result as T;
  }

  // For legacy NodeJS support
  if (typeof File !== 'undefined' && valueToClone instanceof File) {
    const result = new File([valueToClone], valueToClone.name, {
      type: valueToClone.type,
    });
    stack.set(valueToClone, result);

    copyProperties(
      result,
      valueToClone,
      objectToClone,
      stack,
      node,
      cloneValue,
      true,
    );

    return result as T;
  }

  // For environments that don't support Blob, like mini-programs
  if (typeof Blob !== 'undefined' && valueToClone instanceof Blob) {
    const result = new Blob([valueToClone], { type: valueToClone.type });
    stack.set(valueToClone, result);

    copyProperties(
      result,
      valueToClone,
      objectToClone,
      stack,
      node,
      cloneValue,
      true,
    );

    return result as T;
  }

  if (valueToClone instanceof Error) {
    const result = structuredClone(valueToClone) as Error;
    stack.set(valueToClone, result);

    result.message = valueToClone.message;
    result.name = valueToClone.name;
    result.stack = valueToClone.stack;
    result.constructor = valueToClone.constructor;

    // `cause` is non-enumerable, so copyProperties never reaches it; without
    // this it would be shared by reference with the original.
    if (Object.hasOwn(valueToClone, 'cause')) {
      result.cause = deepCloneWithImpl(
        valueToClone.cause,
        'cause',
        objectToClone,
        stack,
        node,
        cloneValue,
      );
    }

    copyProperties(
      result,
      valueToClone,
      objectToClone,
      stack,
      node,
      cloneValue,
      true,
    );

    return result as T;
  }

  if (
    valueToClone instanceof Boolean ||
    valueToClone instanceof Number ||
    valueToClone instanceof String
  ) {
    const result = new (valueToClone.constructor as any)(
      valueToClone.valueOf(),
    );
    stack.set(valueToClone, result);

    copyProperties(
      result,
      valueToClone,
      objectToClone,
      stack,
      node,
      cloneValue,
      true,
    );

    return result as T;
  }

  if (isCloneableObject(valueToClone)) {
    const result = Object.create(proto);

    stack.set(valueToClone, result);

    copyProperties(
      result,
      valueToClone,
      objectToClone,
      stack,
      node,
      cloneValue,
      false,
    );

    return result as T;
  }

  return valueToClone;
}

/**
 * Copies own enumerable string and symbol properties. `guarded` targets are
 * built-ins that already own properties of their own (a `String` wrapper's
 * indexes, say), which are left alone when not writable.
 */
function copyProperties<T>(
  target: any,
  source: any,
  objectToClone: T,
  stack: Map<any, any>,
  parent: WithCustomizer.PathNode | undefined,
  cloneValue: WithCustomizer<T> | undefined,
  guarded: boolean,
): void {
  const keys = Object.keys(source);

  for (let i = 0; i < keys.length; i++) {
    copyProperty(
      target,
      source,
      keys[i],
      objectToClone,
      stack,
      parent,
      cloneValue,
      guarded,
    );
  }

  const symbols = Object.getOwnPropertySymbols(source);

  for (let i = 0; i < symbols.length; i++) {
    if (Object.prototype.propertyIsEnumerable.call(source, symbols[i])) {
      copyProperty(
        target,
        source,
        symbols[i],
        objectToClone,
        stack,
        parent,
        cloneValue,
        guarded,
      );
    }
  }
}

function copyProperty<T>(
  target: any,
  source: any,
  key: PropertyKey,
  objectToClone: T,
  stack: Map<any, any>,
  parent: WithCustomizer.PathNode | undefined,
  cloneValue: WithCustomizer<T> | undefined,
  guarded: boolean,
): void {
  if (guarded) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);

    if (descriptor !== undefined && !descriptor.writable) return;
  }

  const value = source[key];
  const cloned =
    cloneValue === undefined
      ? undefined
      : cloneValue(value, key, objectToClone, stack, parent);

  target[key] =
    cloned !== undefined
      ? cloned
      : typeof value !== 'object' || value === null
        ? value
        : cloneObject(value, key, objectToClone, stack, parent, cloneValue);
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
