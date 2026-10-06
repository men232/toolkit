/**
 * Filters an array of paths to retain only the most specific (deepest) paths,
 * removing any path that is a prefix of another path.
 *
 * @param {string[]} keys - An array of dot-separated string paths.
 * @returns {string[]} - A new array containing only the most specific paths.
 *
 * @example
 * const inputPaths = [
 *   'profile',
 *   'profile.basic',
 *   'profile.basic.fullName',
 *   'profile.updatedAt'
 * ];
 *
 * const result = getMostSpecificPaths(inputPaths);
 * console.log(result); // ['profile.basic.fullName', 'profile.updatedAt']
 *
 * @group Files
 */
export function getMostSpecificPaths(keys: string[]): string[] {
  var sorted = keys.slice().sort();
  var len = sorted.length;
  var result: string[] = [];
  var current, next, code, j;

  outer: for (var i = 0; i < len; i++) {
    current = sorted[i];
    next = sorted[i + 1];

    if (current === next) continue;

    if (next === undefined || !next.startsWith(current)) {
      result.push(current);
      continue;
    }

    code = next.charCodeAt(current.length);

    if (code === 46) continue;

    for (
      j = i + 2;
      code < 46 && j < len && sorted[j].startsWith(current);
      j++
    ) {
      code = sorted[j].charCodeAt(current.length);

      if (code === 46) continue outer;
      if (code > 46) break;
    }

    result.push(current);
  }

  return result;
}
