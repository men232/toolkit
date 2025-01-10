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
  keys = [...keys].sort();

  const result = [];

  for (let i = 0; i < keys.length; i++) {
    const currentPath = keys[i];
    const nextPath = keys[i + 1];

    if (currentPath === nextPath) continue;

    if (!nextPath || !nextPath.startsWith(currentPath + '.')) {
      result.push(currentPath);
    }
  }

  return result;
}
