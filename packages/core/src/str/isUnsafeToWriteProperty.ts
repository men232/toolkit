/**
 * Checks if a property key is unsafe to write through.
 *
 * Following `__proto__`, `constructor` or `prototype` from a plain object
 * leads to shared prototypes (`Object.prototype`, `Function.prototype`), so a
 * write that walks a path through one of these keys can pollute every object.
 * Returns `true` for these three keys.
 *
 * Unlike `isUnsafeProperty`, which only matches `__proto__`, this also matches
 * `constructor` and `prototype`, since reading them is harmless but writing
 * through them is not.
 *
 * @param key - The property key to check
 * @returns `true` if the property is unsafe to write to, `false` otherwise
 * @internal
 */
export function isUnsafeToWriteProperty(key: PropertyKey) {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}
