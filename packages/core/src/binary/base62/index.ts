import { basex } from '../basex';

/**
 * Base62 encoder/decoder for binary data.
 *
 * @example Basic usage
 * ```typescript
 * const data = new Uint8Array([255, 128, 64]);
 * const encoded = base62.encode(data);
 * console.log(encoded);
 *
 * const decoded = base62.decode(encoded);
 * console.log(decoded); // Uint8Array [255, 128, 64]
 * ```
 *
 * @example Text encoding
 * ```typescript
 * const text = "Hello World!";
 * const bytes = new TextEncoder().encode(text);
 * const encoded = base62.encode(bytes);
 * const decoded = base62.decode(encoded);
 * const result = new TextDecoder().decode(decoded);
 * console.log(result); // "Hello World!"
 * ```
 *
 * @group Binary
 */
export const base62 = basex(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
);
