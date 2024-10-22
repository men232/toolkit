/**
 * This function make sorted series array from number[]
 *
 * For example: [1, 2, 3, 6, 7]
 *
 * Result: [[1, 3], [6, 7]]
 */
export function seriesList(list: Array<number>) {
  const result = [];
  list = [...list].sort();

  let sStart = list.shift() as number;
  let sEnd;

  while (list.length) {
    const value = list.shift() as number;

    if (!sEnd) {
      if (value - sStart > 1) {
        result.push([sStart], [value]);
        sStart = list.shift() as number;
      } else {
        sEnd = value;
      }
    } else {
      if (value - sEnd > 1) {
        result.push([sStart, sEnd]);

        sStart = value;
        sEnd = null;
      } else {
        sEnd = value;
      }
    }
  }

  if (sStart && sEnd) {
    result.push([sStart, sEnd]);
  } else {
    if (sStart) result.push([sStart]);
    if (sEnd) result.push([sEnd]);
  }

  return result;
}
