import { describe, expect, it } from 'vitest';
import { AppError } from './AppError';

describe('AppError', () => {
  it('should create an error with default values when no arguments are provided', () => {
    const error = new AppError(500);
    expect(error.message).toBe('Internal Server Error');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('ERR_UNKNOWN');
    expect(error.name).toBe('AppError');
  });

  it('should create an error with default values when no arguments are provided', () => {
    const error = new AppError('Test');
    expect(error.message).toBe('Test');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('ERR_UNKNOWN');
    expect(error.name).toBe('AppError');
  });

  it('should create an error with a custom message and status code', () => {
    const error = new AppError('Custom error message', 404);
    expect(error.message).toBe('Custom error message');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('ERR_UNKNOWN');
  });

  it('should use the provided options', () => {
    const error = new AppError(403, {
      cause: new Error('Forbidden access'),
      code: 'ERR_FORBIDDEN',
    });
    expect(error.message).toBe('Forbidden');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('ERR_FORBIDDEN'); // The constructor does not assign options.code
    expect(error.cause).toBeInstanceOf(Error);
    expect((error.cause as any)?.message).toBe('Forbidden access');
  });

  it('should correctly identify AppError instances using the static is method', () => {
    const error = new AppError(400);
    expect(AppError.is(error)).toBe(true);
    expect(AppError.is(new Error('Not an AppError'))).toBe(false);
    expect(AppError.is({ name: 'AppError' })).toBe(true);
  });

  it('should fall back to unknown error message for unrecognized status codes', () => {
    const error = new AppError(999);
    expect(error.message).toBe('Unknown error');
    expect(error.statusCode).toBe(999);
  });

  it('should capture stack trace', () => {
    const error = new AppError(500);
    expect(error.stack).toBeDefined();
  });
});
