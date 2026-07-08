import { isError, isPrimitive, isString } from '@/is';
import {
  type WithCustomizerFactory,
  createCustomizerFactory,
} from './deepCloneWith';

var SECURE_LABEL = `<** secure **>`;
var CIRCULAR_LABEL = `<** circular **>`;

export interface SecureCustomizerOptions {
  /**
   * @default true
   */
  normalizeError?: boolean;
}

/**
 * Creates a {@link WithCustomizerFactory} that redacts sensitive property values
 * and handles circular references when used with {@link deepCloneWith}.
 *
 * - **Primitive values** whose key matches one of `properties` are replaced with
 *   `<** secure **>` (key comparison is not case-insensitive).
 * - **Circular references** are replaced with `<** circular **>`.
 * - **Error objects** are normalised to a plain `{ message, stack, name, cause }`
 *   shape unless `normalizeError` is set to `false`.
 *
 * @param properties - Property keys to redact (case-insensitive for strings).
 * @param opts - Optional behaviour flags.
 *
 * @example
 * // Basic redaction
 * const customizer = createSecureCustomizer(['password', 'token']);
 * const result = deepCloneWith(
 *   { user: 'alice', password: 'secret', token: 'abc123' },
 *   customizer,
 * );
 * // → { user: 'alice', password: '<** secure **>', token: '<** secure **>' }
 *
 * @example
 * // Nested objects — redaction applies at any depth
 * const customizer = createSecureCustomizer(['apiKey']);
 * const result = deepCloneWith(
 *   { service: { apiKey: 'key-xyz', url: 'https://api.example.com' } },
 *   customizer,
 * );
 * // → { service: { apiKey: '<** secure **>', url: 'https://api.example.com' } }
 *
 * @example
 * // Error normalisation (on by default)
 * const customizer = createSecureCustomizer([]);
 * const result = deepCloneWith({ err: new Error('oops') }, customizer);
 * // → { err: { message: 'oops', name: 'Error', stack: '...', cause: undefined } }
 *
 * @example
 * // Disable Error normalisation
 * const customizer = createSecureCustomizer([], { normalizeError: false });
 * const result = deepCloneWith({ err: new Error('oops') }, customizer);
 * // → { err: Error('oops') }  — the Error instance is preserved
 *
 * @group Object
 */
export function createSecureCustomizer(
  properties: PropertyKey[],
  opts?: SecureCustomizerOptions,
): WithCustomizerFactory {
  var propertiesSet = Object.freeze(
    new Set<PropertyKey>(
      properties.map(v => (isString(v) ? v.toLocaleLowerCase() : v)),
    ),
  );

  var withCustomizer = (
    seenSet: WeakSet<any>,
    value: any,
    key?: PropertyKey,
  ): any => {
    if (isPrimitive(value)) {
      if (key === undefined) return;

      var normalizedKey: PropertyKey = isString(key)
        ? key.toLocaleLowerCase()
        : key;

      if (!propertiesSet.has(normalizedKey)) return;

      return SECURE_LABEL;
    }

    if (seenSet.has(value)) {
      return CIRCULAR_LABEL;
    }

    seenSet.add(value);

    if (isError(value) && opts?.normalizeError !== false) {
      return {
        message: value.message,
        stack: value.stack,
        name: value.name,
        cause:
          value.cause !== undefined
            ? withCustomizer(seenSet, value.cause)
            : undefined,
      };
    }
  };

  return createCustomizerFactory(() => {
    return withCustomizer.bind(null, new WeakSet());
  });
}
