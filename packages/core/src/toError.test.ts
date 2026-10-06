import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { isError } from './is';
import { toError } from './toError';

describe('toError', () => {
  it('returns an Error as is', () => {
    const error = new TypeError('boom');

    expect(toError(error)).toBe(error);
  });

  it('uses a thrown string as the message', () => {
    const error = toError('boom');

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('boom');
    expect(error.cause).toBe('boom');
  });

  it('uses the message of an error-like object', () => {
    const value = { message: 'from object', code: 1 };

    expect(toError(value).message).toBe('from object');
    expect(toError(value).cause).toBe(value);
  });

  it('stringifies other primitives', () => {
    expect(toError(42).message).toBe('42');
    expect(toError(false).message).toBe('false');
    expect(toError(10n).message).toBe('10');
  });

  it('falls back to the unknown message', () => {
    expect(toError(null).message).toBe('Unknown error');
    expect(toError(undefined).message).toBe('Unknown error');
    expect(toError({ code: 1 }).message).toBe('Unknown error');
    expect(toError('').message).toBe('Unknown error');
    expect(toError({ code: 1 }, 'Request failed').message).toBe(
      'Request failed',
    );
  });

  it('recognises errors from another realm', () => {
    const foreign = vm.runInNewContext('new TypeError("other realm")');

    expect(isError(foreign)).toBe(true);
    expect(toError(foreign)).toBe(foreign);
  });
});
