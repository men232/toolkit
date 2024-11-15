/**
 * Recursively freezes an object or array, making it immutable at all levels.
 *
 * This function is similar to `Object.freeze()`, but instead of freezing only the top-level
 * properties of an object, it recursively freezes every nested object or array, ensuring
 * that no properties or elements can be modified at any depth.
 *
 * **Important**:
 * - Once frozen, attempting to modify any property or element of the object will result in an error in strict mode.
 * - If a property of an object or an element of an array is itself an object, it will also be frozen.
 *
 * @param {T} value - The object or array to freeze deeply.
 * @returns {T} The frozen object or array, which is also deeply immutable.
 *
 * @example
 * const config = deepFreeze({
 *   db: { uri: '' },
 * });
 *
 * config.db.uri = 'test'; // Error: Cannot assign to read-only property 'uri' of object
 *
 * @example
 * const arr = deepFreeze([ { name: 'Alice' }, { name: 'Bob' } ]);
 * arr[0].name = 'Charlie'; // Error: Cannot assign to read-only property 'name' of object
 *
 * @group Object
 */
export function deepFreeze<T extends object | unknown[]>(value: T): T {
  let currentValue: any = value;

  if (!currentValue || typeof currentValue !== 'object') return currentValue;

  Object.freeze(currentValue);

  if (Array.isArray(currentValue)) {
    for (const item of currentValue) {
      deepFreeze(item);
    }

    return currentValue as T;
  } else {
    for (const value of Object.values(currentValue)) {
      deepFreeze(value as any);
    }
  }

  return currentValue;
}
