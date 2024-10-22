import { isError } from './is.js';

/**
 * Transform value to error object
 */
export function toError<T>(
  value: T,
  unknownMessage = 'Unknown error',
): T extends Error ? T : Error {
  if (isError(value)) {
    return value as any;
  }

  const error = new Error(unknownMessage, { cause: value });

  Error.captureStackTrace(error, toError);

  return error as any;
}
