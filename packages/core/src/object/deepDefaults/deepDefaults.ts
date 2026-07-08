import { isPlainObject } from '@/is';

/**
 * Recursively assigns default properties.
 * @param object The destination object.
 * @param sources The source objects.
 * @return Returns object.
 *
 * @example
 * const obj = { name: 'Alice', age: 30 };
 * const defaults = { name: 'Bob', age: 25, country: 'Wonderland' };
 *
 * deepDefaults(obj, defaults);
 * console.log(obj);
 * // Output: { name: 'Alice', age: 30, country: 'Wonderland' }
 * // The 'name' and 'age' properties are not overwritten since they already exist.
 *
 * @example
 * const obj = { user: { name: 'Alice' } };
 * const defaults = { user: { age: 25 } };
 *
 * deepDefaults(obj, defaults);
 * console.log(obj);
 * // Output: { user: { name: 'Alice', age: 25 } }
 * // The 'age' property is added to 'user', while 'name' remains unchanged.
 *
 * @group Object
 */
export const deepDefaults = function <T = any>(
  target: any,
  ...sources: any[]
): T {
  target = Object(target);

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    if (source != null) {
      defaultsDeepRecursive(target, source, new WeakMap());
    }
  }

  return target;
};

function defaultsDeepRecursive(
  target: any,
  source: any,
  stack: WeakMap<any, any>,
): void {
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (targetValue === undefined || !Object.hasOwn(target, key)) {
      target[key] = handleMissingProperty(sourceValue, stack);
      continue;
    }

    if (stack.get(sourceValue) === targetValue) {
      // skipping circular reference
      continue;
    }

    handleExistingProperty(targetValue, sourceValue, stack);
  }
}

function handleMissingProperty(
  sourceValue: any,
  stack: WeakMap<any, any>,
): any {
  if (stack.has(sourceValue)) {
    return stack.get(sourceValue);
  }

  if (isPlainObject(sourceValue)) {
    const newObj = {};
    stack.set(sourceValue, newObj);
    defaultsDeepRecursive(newObj, sourceValue, stack);
    return newObj;
  }

  return sourceValue;
}

function handleExistingProperty(
  targetValue: any,
  sourceValue: any,
  stack: WeakMap<any, any>,
): void {
  if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
    stack.set(sourceValue, targetValue);
    defaultsDeepRecursive(targetValue, sourceValue, stack);
    return;
  }

  if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
    stack.set(sourceValue, targetValue);
    mergeArrays(targetValue, sourceValue, stack);
  }
}

function mergeArrays(
  targetArray: any[],
  sourceArray: any[],
  stack: WeakMap<any, any>,
): void {
  const minLength = Math.min(sourceArray.length, targetArray.length);

  for (let i = 0; i < minLength; i++) {
    if (isPlainObject(targetArray[i]) && isPlainObject(sourceArray[i])) {
      defaultsDeepRecursive(targetArray[i], sourceArray[i], stack);
    }
  }
  for (let i = minLength; i < sourceArray.length; i++) {
    targetArray.push(sourceArray[i]);
  }
}
