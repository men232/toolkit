import { isError } from './is.js';

/**
 * Transform value to error object
 *
 * An `Error` (including one from another realm) is returned as is. Anything else is wrapped in a new
 * `Error` with the value as `cause` and a message taken from it: a string is the message itself, an
 * object's string `message` is reused, other primitives are stringified, and everything else gets
 * `unknownMessage`.
 *
 * @example
 * toError('boom').message; // 'boom'
 * toError({ message: 'Not found', code: 404 }).message; // 'Not found'
 * toError(null).message; // 'Unknown error'
 *
 * @replaces `err instanceof Error ? err.message : String(err)` — `toError(err).message` gives the same
 * text for errors, strings and numbers, uses `message` of error-like objects instead of `'[object Object]'`,
 * and recognises errors from another realm (`vm`, iframes).
 * @detect `instanceof\s+Error\s*\?\s*[\w.]+\.message\s*:\s*String\(`
 *
 * @group Errors
 */
export function toError<T>(
  value: T,
  unknownMessage = 'Unknown error',
): T extends Error ? T : Error {
  if (isError(value)) {
    return value as any;
  }

  const error = new Error(messageOf(value, unknownMessage), { cause: value });

  Error.captureStackTrace(error, toError);

  return error as any;
}

function messageOf(value: unknown, unknownMessage: string): string {
  switch (typeof value) {
    case 'string':
      return value || unknownMessage;
    case 'number':
    case 'boolean':
    case 'bigint':
    case 'symbol':
      return String(value);
    case 'object': {
      const message = (value as { message?: unknown } | null)?.message;

      if (typeof message === 'string' && message) return message;
    }
  }

  return unknownMessage;
}
