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
 * @replaces `while (n > 0n) { out = CHARS[Number(n % 62n)] + out; n /= 62n; }` — keeps leading zero bytes and
 * round-trips through `decode`. The alphabet is `0-9A-Za-z`; output differs from schemes that order it `0-9a-zA-Z`
 * (use `basex` with that alphabet) and from `base62Fast`.
 * @detect `[%/]=?\s*62n\b|BigInt\(\s*62\s*\)`
 *
 * @group Binary
 */
export const base62 = basex(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
);
