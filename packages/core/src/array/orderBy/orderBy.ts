import { isFunction } from '@/is';
import { compareAscending } from './compareAscending';

export function orderBy<T>(
  array: Array<T>,
  fields: (string | ((item: T) => any))[],
  orders: ('asc' | 'desc')[],
): Array<T> {
  return array.sort((a, b) => {
    let index = -1,
      length = fields.length,
      ordersLength = orders.length;

    while (++index < length) {
      const field = fields[index];
      const filedFn = isFunction(field);

      const objCriteria = filedFn ? field(a) : (a as any)?.[field];
      const othCriteria = filedFn ? field(b) : (b as any)?.[field];

      const result = compareAscending(objCriteria, othCriteria);

      if (result) {
        if (index >= ordersLength) {
          return result;
        }
        return result * (orders[index] === 'desc' ? -1 : 1);
      }
    }

    return 0;
  });
}
