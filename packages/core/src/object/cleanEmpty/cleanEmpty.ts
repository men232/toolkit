import { isEmpty } from '@/is';

/**
 * Cleanup empty object fields
 *
 * ⚠️ Mutates original object
 *
 * @example
 * const user = { id: 1, name: 'Andrew', roles: [], };
 *
 * cleanEmpty(user);
 *
 * console.log(user); // '{ id: 1, name: 'Andrew' }'
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
