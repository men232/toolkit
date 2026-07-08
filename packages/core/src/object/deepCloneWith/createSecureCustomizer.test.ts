import { describe, expect, it } from 'vitest';
import { createSecureCustomizer } from './createSecureCustomizer';
import { deepCloneWith } from './deepCloneWith';

const SECURE = '<** secure **>';
const CIRCULAR = '<** circular **>';

describe('createSecureCustomizer', () => {
  it('redacts a matching top-level string property', () => {
    const customizer = createSecureCustomizer(['password']);
    const result = deepCloneWith(
      { password: 'secret', name: 'Alice' },
      customizer,
    );
    expect(result).toEqual({ password: SECURE, name: 'Alice' });
  });

  it('redacts matching properties regardless of key casing', () => {
    const customizer = createSecureCustomizer(['token']);
    const result = deepCloneWith(
      { TOKEN: 'abc', Token: 'def', token: 'ghi' },
      customizer,
    );
    expect(result).toEqual({ TOKEN: SECURE, Token: SECURE, token: SECURE });
  });

  it('redacts properties case-insensitively against the properties list', () => {
    const customizer = createSecureCustomizer(['PASSWORD']);
    const result = deepCloneWith({ password: 'secret' }, customizer);
    expect(result).toEqual({ password: SECURE });
  });

  it('does not redact non-matching properties', () => {
    const customizer = createSecureCustomizer(['secret']);
    const result = deepCloneWith({ name: 'Alice', age: 30 }, customizer);
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('redacts matching properties in nested objects', () => {
    const customizer = createSecureCustomizer(['apiKey']);
    const result = deepCloneWith(
      { user: { apiKey: 'key-123', name: 'Bob' } },
      customizer,
    );
    expect(result).toEqual({ user: { apiKey: SECURE, name: 'Bob' } });
  });

  it('redacts multiple fields', () => {
    const customizer = createSecureCustomizer(['password', 'token']);
    const result = deepCloneWith(
      { password: 'p', token: 't', email: 'e@e.com' },
      customizer,
    );
    expect(result).toEqual({
      password: SECURE,
      token: SECURE,
      email: 'e@e.com',
    });
  });

  it('does not redact non-string primitives even if the key matches', () => {
    const customizer = createSecureCustomizer(['count']);
    const result = deepCloneWith({ count: 42 }, customizer);
    expect(result).toEqual({ count: SECURE });
  });

  it('does not modify the original object', () => {
    const customizer = createSecureCustomizer(['password']);
    const original = { password: 'secret' };
    deepCloneWith(original, customizer);
    expect(original.password).toBe('secret');
  });

  it('replaces circular references with circular label', () => {
    const customizer = createSecureCustomizer([]);
    const obj: any = { a: 1 };
    obj.self = obj;
    const result = deepCloneWith(obj, customizer);
    expect(result.self).toBe(CIRCULAR);
  });

  it('normalizes Error values by default', () => {
    const customizer = createSecureCustomizer([]);
    const err = new Error('oops');
    const result = deepCloneWith({ err }, customizer);
    expect(result.err).toEqual(
      expect.objectContaining({ message: 'oops', name: 'Error' }),
    );
    expect(result.err).not.toBeInstanceOf(Error);
  });

  it('preserves Error instances when normalizeError is false', () => {
    const customizer = createSecureCustomizer([], { normalizeError: false });
    const err = new Error('oops');
    const result = deepCloneWith({ err }, customizer);
    expect(result.err).toBeInstanceOf(Error);
  });

  it('normalizes nested Error cause', () => {
    const customizer = createSecureCustomizer([]);
    const cause = new Error('root cause');
    const err = new Error('wrapper', { cause });
    const result = deepCloneWith({ err }, customizer);
    expect(result.err.cause).toEqual(
      expect.objectContaining({ message: 'root cause' }),
    );
  });

  it('each call creates an independent seen-set (factory reuse)', () => {
    const customizer = createSecureCustomizer([]);
    const obj: any = { a: 1 };
    obj.self = obj;
    const r1 = deepCloneWith(obj, customizer);
    const r2 = deepCloneWith(obj, customizer);
    expect(r1.self).toBe(CIRCULAR);
    expect(r2.self).toBe(CIRCULAR);
  });
});
