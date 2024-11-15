import { isEmpty } from '@/is';

/**
 * Removes properties with empty values from an object.
 *
 * This function iterates over the object's keys and deletes any property whose value
 * is considered "empty" (e.g., `null`, `undefined`, `[]`, `{}`, `''`, `false`).
 *
 * ⚠️ **Mutates the original object**: The input object is directly modified, and properties
 * are removed from it.
 *
 * @param {Record<string, any>} obj - The object to clean up, where empty fields will be removed.
 * @returns {Record<string, any>} The cleaned object with empty fields removed.
 *
 * @example
 * const user = { id: 1, name: 'Andrew', roles: [], address: null };
 * cleanEmpty(user);
 *
 * console.log(user); // Outputs: { id: 1, name: 'Andrew' }
 *
 * @example
 * const product = { name: 'Laptop', description: '', price: 1000, tags: [] };
 * cleanEmpty(product);
 *
 * console.log(product); // Outputs: { name: 'Laptop', price: 1000 }
 *
 * @group Object
 */
export function cleanEmpty(obj: Record<any, any>): Record<any, any> {
  let value;
  for (const key of Object.keys(obj)) {
    value = obj[key];

    if (isEmpty(value)) {
      delete obj[key];
    }
  }

  return obj;
}
