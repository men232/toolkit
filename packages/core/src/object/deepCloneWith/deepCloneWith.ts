import { arrayable } from '@/array/arrayable';
import { isError, isPrimitive, isString } from '@/is';
import type { Arrayable } from '@/types';
import _cloneDeepWith from 'lodash/cloneDeepWith.js';
import { def } from '../def';

const WITH_CUSTOMIZER_FACTORY_SYM = Symbol();

export type WithCustomizer = (
  value: any,
  key: number | string | undefined,
) => any;

export type WithCustomizerFactory = () => WithCustomizer;

export type WithCustomizerValue = Readonly<
  Arrayable<WithCustomizer | WithCustomizerFactory>
>;

/**
 * Recursively clones the provided value with a customizer function that allows for transformation of certain values during the cloning process.
 *
 * This function deep clones the value while providing a way to customize the cloning behavior of certain properties or elements.
 * The `customizer` function will be called for each value being cloned, and if the customizer function returns a value other than `undefined`,
 * the original value will be replaced with the returned value. This allows for specific modifications to parts of the structure being cloned.
 *
 * @param {T} value - The value to recursively clone. Can be any type (object, array, primitive, etc.).
 * @param {WithCustomizerValue} customizer - A function to customize the cloning process. It receives the current value and key, and must return
 *                                            either a modified value or `undefined` (to keep the original value).
 *
 * @returns {T} Returns a new deep clone of the original value, with customizations applied as per the `customizer` function.
 *
 * @example
 * const original = { name: 'Alice', age: 30, details: { country: 'Wonderland', city: 'London' } };
 *
 * const customizer = (value, key) => {
 *   if (key === 'city') return 'Paris';  // Customizing the 'city' field to 'Paris'.
 * };
 *
 * const cloned = deepCloneWith(original, customizer);
 * console.log(cloned.details.city);  // 'Paris'
 * console.log(original.details.city);  // 'London' (original is unchanged)
 *
 * @example
 * const arr = [1, [2, 3], 4];
 *
 * const customizer = (value) => {
 *   if (Array.isArray(value)) return value.map(item => item * 2);  // Doubling the numbers inside arrays.
 * };
 *
 * const clonedArr = deepCloneWith(arr, customizer);
 * console.log(clonedArr); // [1, [4, 6], 4]
 * console.log(arr); // [1, [2, 3], 4] (original is unchanged)
 *
 * @group Object
 */
export function deepCloneWith<T>(value: T, customizer: WithCustomizerValue): T {
  const fns = prepareCustomizes(customizer);

  return _cloneDeepWith(value, (value, key) => {
    let newValue;
    let replaced = false;

    for (const fn of fns) {
      newValue = fn(value, key);

      if (newValue !== undefined) {
        value = newValue;
        replaced = true;
      }
    }

    if (replaced) return value;
  });
}

export function createDeepCloneWith(
  customizer: WithCustomizerValue,
): <T>(value: T) => T {
  return value => {
    return deepCloneWith(value, customizer);
  };
}

function prepareCustomizes(value: WithCustomizerValue): WithCustomizer[] {
  return arrayable(value).map(v => (isCustomizerFactory(v) ? v() : v));
}

export function isCustomizerFactory(
  value: unknown,
): value is WithCustomizerFactory {
  // @ts-expect-error
  return value?.[WITH_CUSTOMIZER_FACTORY_SYM] === true;
}

export function createCustomizer(fn: WithCustomizer): WithCustomizer {
  return fn;
}

export function createCustomizerFactory(
  fn: (...args: any[]) => WithCustomizer,
): WithCustomizerFactory {
  def(fn, WITH_CUSTOMIZER_FACTORY_SYM, true);
  return fn;
}

export interface SecureCustomizerOptions {
  /**
   * @default true
   */
  normalizeError?: boolean;
}

export function createSecureCustomizer(
  properties: string[],
  opts?: SecureCustomizerOptions,
): WithCustomizerFactory {
  const secureLabel = `<** secure **>`;
  const circularLabel = `<** circular **>`;
  const propertiesSet = Object.freeze(
    new Set(properties.map(v => v.toLocaleLowerCase())),
  );

  const withCustomizer = (
    seenSet: WeakSet<any>,
    value: any,
    key?: PropertyKey,
  ): any => {
    if (isPrimitive(value)) {
      if (!isString(key)) return;
      if (!propertiesSet.has(key.toLocaleLowerCase())) return;

      return secureLabel;
    }

    if (seenSet.has(value)) {
      return circularLabel;
    }

    seenSet.add(value);

    if (isError(value) && opts?.normalizeError !== false) {
      return {
        message: value.message,
        stack: value.stack,
        name: value.name,
        cause:
          value.cause !== undefined
            ? withCustomizer(seenSet, value.cause)
            : undefined,
      };
    }
  };

  return createCustomizerFactory(() => {
    const seenSet = new WeakSet();
    return withCustomizer.bind(null, seenSet);
  });
}
