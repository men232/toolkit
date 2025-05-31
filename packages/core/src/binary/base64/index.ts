import { Base64Encoding } from './Base64Encoding';

/**
 * Base64 encoder/decoder for binary data
 *
 * @example Basic usage
 * ```typescript
 * const data = new Uint8Array([255, 128, 64]);
 * const encoded = base64.encode(data);
 * console.log(encoded);
 *
 * const decoded = base64.decode(encoded);
 * console.log(decoded); // Uint8Array [255, 128, 64]
 * ```
 *
 * @example Text encoding
 * ```typescript
 * const text = "Hello World!";
 * const bytes = new TextEncoder().encode(text);
 * const encoded = base64.encode(bytes);
 * const decoded = base64.decode(encoded);
 * const result = new TextDecoder().decode(decoded);
 * console.log(result); // "Hello World!"
 * ```
 *
 * @group Binary
 */
export const base64 = new Base64Encoding(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
);

/**
 * Base64 encoder/decoder for binary data
 *
 * @example Basic usage
 * ```typescript
 * const data = new Uint8Array([255, 128, 64]);
 * const encoded = base64url.encode(data);
 * console.log(encoded);
 *
 * const decoded = base64url.decode(encoded);
 * console.log(decoded); // Uint8Array [255, 128, 64]
 * ```
 *
 * @example Text encoding
 * ```typescript
 * const text = "Hello World!";
 * const bytes = new TextEncoder().encode(text);
 * const encoded = base64url.encode(bytes);
 * const decoded = base64url.decode(encoded);
 * const result = new TextDecoder().decode(decoded);
 * console.log(result); // "Hello World!"
 * ```
 *
 * @group Binary
 */
export const base64url = new Base64Encoding(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
);
