import { describe, expect, it } from 'vitest';
import { constant } from './constant';

describe('constant', () => {
  it('returns the same primitive value on every call', () => {
    const fn = constant(42);
    expect(fn()).toBe(42);
    expect(fn()).toBe(42);
  });

  it('returns the same object reference on every call', () => {
    const obj = { a: 1 };
    const fn = constant(obj);
    expect(fn()).toBe(obj);
    expect(fn()).toBe(fn());
  });

  it('works with null', () => {
    expect(constant(null)()).toBeNull();
  });

  it('works with undefined (no argument)', () => {
    expect(constant()()).toBeUndefined();
  });

  it('works with false', () => {
    expect(constant(false)()).toBe(false);
  });

  it('works with an empty string', () => {
    expect(constant('')()).toBe('');
  });

  it('ignores arguments passed to the returned function', () => {
    const fn = constant(7) as (...args: any[]) => number;
    expect(fn(1, 2, 3)).toBe(7);
  });
});
