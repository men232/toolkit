/**
 * Divide an array into sub-arrays of a fixed chunk size
 */
export function chunk<T>(list: T[], size: number = 1): T[][] {
  return list.reduce((res, item, index) => {
    if (index % size === 0) {
      res.push([]);
    }
    res[res.length - 1].push(item);
    return res;
  }, [] as T[][]);
}
