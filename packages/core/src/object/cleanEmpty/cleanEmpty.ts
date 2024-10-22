import { isEmpty } from '@/is';

/**
 * Cleanup empty object fields
 * Returns same object
 */
export function cleanupEmpty(obj: Record<any, any>): Record<any, any> {
  let value;
  for (const key of Object.keys(obj)) {
    value = obj[key];

    if (isEmpty(value)) {
      delete obj[key];
    }
  }

  return obj;
}
