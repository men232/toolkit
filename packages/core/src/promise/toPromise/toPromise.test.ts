import { describe, expect, it } from 'vitest';
import { toPromise } from './toPromise';

describe('toPromise', () => {
  it('resolves a plain value', () => {
    return toPromise(42).then(result => {
      expect(result).toBe(42);
    });
  });

  it('resolves null', () => {
    return toPromise(null).then(result => {
      expect(result).toBeNull();
    });
  });

  it('resolves undefined', () => {
    return toPromise(undefined).then(result => {
      expect(result).toBeUndefined();
    });
  });

  it('calls a sync function and resolves its return value', () => {
    return toPromise(() => 99).then(result => {
      expect(result).toBe(99);
    });
  });

  it('calls an async function and resolves its return value', () => {
    return toPromise(() => Promise.resolve('hello')).then(result => {
      expect(result).toBe('hello');
    });
  });

  it('always returns a Promise', () => {
    expect(toPromise(1)).toBeInstanceOf(Promise);
    expect(toPromise(() => 1)).toBeInstanceOf(Promise);
  });

  it('rejects when the function throws synchronously', () => {
    return expect(
      toPromise(() => {
        throw new Error('sync error');
      }),
    ).rejects.toThrow('sync error');
  });

  it('rejects when the function returns a rejected promise', () => {
    return expect(
      toPromise(() => Promise.reject(new Error('async error'))),
    ).rejects.toThrow('async error');
  });

  it('executes the function asynchronously (next microtask)', () => {
    const order: string[] = [];
    const p = toPromise(() => {
      order.push('fn');
    });
    order.push('after');
    return p.then(() => {
      expect(order).toEqual(['after', 'fn']);
    });
  });
});
