/**
 * Assigns `value` to `target[key]` as an own enumerable property.
 *
 * Plain assignment of a `__proto__` key changes the prototype of `target`
 * instead of creating an own property (`JSON.parse` does produce such keys),
 * so that one key goes through `defineProperty`.
 */
export function setOwnProperty(target: any, key: PropertyKey, value: any) {
  if (key === '__proto__') {
    Object.defineProperty(target, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  } else {
    target[key] = value;
  }
}
