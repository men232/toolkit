import _cloneDeep from 'lodash/cloneDeep';

/**
 * Recursively clones the provided value, creating a deep copy.
 *
 * This function performs a deep clone of the provided value. Any nested objects, arrays, or other complex types will be cloned recursively,
 * ensuring that the original value and the cloned value are completely independent.
 *
 * @param {T} value - The value to recursively clone. Can be any type (object, array, primitive, etc.).
 * @returns {T} Returns a new deeply cloned instance of the original value.
 *
 * @example
 * const original = { name: 'Alice', details: { age: 25, country: 'Wonderland' } };
 * const cloned = deepClone(original);
 *
 * cloned.details.age = 30;
 * console.log(original.details.age); // 25
 * console.log(cloned.details.age);   // 30
 *
 * @example
 * const arr = [1, [2, 3], 4];
 * const clonedArr = deepClone(arr);
 * clonedArr[1][0] = 99;
 * console.log(arr[1][0]); // 2
 * console.log(clonedArr[1][0]); // 99
 *
 * @group Object
 */
export const deepClone = <T>(value: T): T => {
  return _cloneDeep(value);
};
