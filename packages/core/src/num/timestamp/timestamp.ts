import { isDate } from '@/is';

/**
 * Returns seconds since unix epoh
 *
 * @group Numbers
 */
export function timestamp(fromValue: Date | number = Date.now()) {
  if (isDate(fromValue)) {
    fromValue = fromValue.getTime();
  }

  return Math.floor(fromValue / 1000);
}
