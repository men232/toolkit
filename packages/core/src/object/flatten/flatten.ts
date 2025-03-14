import { isObject } from '@/is';

interface FlattenOptions {
  /**
   * Character to separate the flattened keys
   */
  separator?: string;

  /**
   * Prefix to add to the flattened keys
   */
  initialPrefix?: string;

  /**
   * Whether to include arrays in the flattened result
   */
  withArrays?: boolean;

  /**
   * Custom function to check if a value is an object
   */
  isObjectCompare?: (value: unknown) => boolean;
}

/**
 * Flattens a nested object into a single-level object, converting nested properties
 * into key-value pairs with keys representing the property path.
 *
 * By default, nested objects are flattened with an underscore (`_`) separator.
 * Arrays can also be flattened into indexed keys. A custom function can be provided
 * to determine if a value should be treated as an object.
 *
 * **Important**:
 * - Nested objects are flattened with keys joined by the `separator` (default: `_`).
 * - Arrays are flattened by their indices (e.g., `array[0]` becomes `array_0`).
 * - A custom `isObjectCompare` function can be provided to determine whether a value
 *   should be treated as an object.
 *
 * @param {Record<string, unknown>} obj - The object to flatten.
 * @param {FlattenOptions} options - Optional configuration for flattening behavior.
 * @param {string} [options.separator='_'] - Separator for flattening object keys (default is '_').
 * @param {string} [options.initialPrefix=''] - Prefix to prepend to flattened keys (default is '').
 * @param {boolean} [options.withArrays=true] - Whether to include arrays in the flattened result (default is true).
 * @param {(value: unknown) => boolean} [options.isObjectCompare=isObject] - Custom function to check if a value is an object.
 * @returns {Record<string, unknown>} - The flattened object.
 *
 * @example
 * flatten({
 *   name: 'Andrew',
 *   config: {
 *     canReadPost: true,
 *     canUpdatePost: true,
 *   }
 * });
 * // Result:
 * // {
 * //   'name': 'Andrew',
 * //   'config_canReadPost': true,
 * //   'config_canUpdatePost': true,
 * // }
 *
 *  @example
 * flatten(
 *   { user: { name: 'Jane', profile: { age: 30 } } },
 *   { separator: '-', initialPrefix: 'root-' }
 * );
 * // Returns:
 * // { 'root-user-name': 'Jane', 'root-user-profile-age': 30 }
 *
 * @group Object
 * @author lukeed
 */
export function flatten(
  obj: Record<string, unknown>,
  {
    separator = '_',
    initialPrefix = '',
    withArrays = true,
    isObjectCompare = isObject,
  }: FlattenOptions = {},
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const seen = new WeakSet();

  if (isObjectCompare(obj)) {
    iter(
      result,
      seen,
      isObjectCompare,
      separator,
      withArrays,
      obj,
      initialPrefix,
      true,
    );
  }

  return result;
}

function iter(
  output: Record<string, unknown>,
  seen: WeakSet<any>,
  isObjectCompare: Exclude<FlattenOptions['isObjectCompare'], undefined>,
  separator: string,
  withArrays: boolean,
  val: any,
  key: string,
  initial?: boolean,
) {
  if (seen.has(val)) return;

  let k,
    pfx = key && !initial ? key + separator : key;

  if (Array.isArray(val)) {
    seen.add(val);

    if (!withArrays) {
      output[key] = val;
      return;
    }

    for (k = 0; k < val.length; k++) {
      iter(
        output,
        seen,
        isObjectCompare,
        separator,
        withArrays,
        val[k],
        pfx + k,
      );
    }
  } else if (isObjectCompare(val)) {
    seen.add(val);

    for (k in val) {
      iter(
        output,
        seen,
        isObjectCompare,
        separator,
        withArrays,
        val[k],
        pfx + k,
      );
    }
  } else {
    output[key] = val;
  }
}
