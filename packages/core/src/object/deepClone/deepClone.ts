import _cloneDeep from 'lodash/cloneDeep';

/**
 * Recursively clones value.
 *
 * @param value The value to recursively clone.
 * @return Returns the deep cloned value.
 *
 * @group Object
 */
export const deepClone = <T>(value: T): T => {
  return _cloneDeep(value);
};
