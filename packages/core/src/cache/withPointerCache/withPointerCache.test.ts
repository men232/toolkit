import { describe, expect, it, vi } from 'vitest';
import { withPointerCache } from './withPointerCache';

describe('withPointerCache', () => {
  it('should cache by pointer and dependencies', () => {
    const pointer = {};
    const fn = vi.fn(() => ({ v: 1 }));

    const first = withPointerCache(pointer, ['a', 'b'], fn);
    const second = withPointerCache(pointer, ['a', 'b'], fn);

    expect(second).toBe(first);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should cache falsy results', () => {
    for (const value of [0, '', false, null, undefined]) {
      const pointer = {};
      const fn = vi.fn(() => value);

      withPointerCache(pointer, ['k'], fn);
      expect(withPointerCache(pointer, ['k'], fn)).toBe(value);
      expect(fn).toHaveBeenCalledTimes(1);
    }
  });

  it('should not mix dependencies that join to the same string', () => {
    const pointer = {};

    expect(withPointerCache(pointer, ['a_b'], () => 1)).toBe(1);
    expect(withPointerCache(pointer, ['a', 'b'], () => 2)).toBe(2);
  });
});
