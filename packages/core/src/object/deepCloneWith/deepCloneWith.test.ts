import { noop } from '@/is';
import { describe, expect, it } from 'vitest';
import { type WithCustomizer, deepCloneWith } from './deepCloneWith';

describe('deepCloneWith', () => {
  it('should clone primitive values', () => {
    expect(deepCloneWith(1, noop)).toBe(1);
    expect(deepCloneWith('test', noop)).toBe('test');
    expect(deepCloneWith(true, noop)).toBe(true);
    expect(deepCloneWith(null, noop)).toBe(null);
    expect(deepCloneWith(undefined, noop)).toBe(undefined);
  });

  it('should deep clone arrays', () => {
    const original = [1, [2, 3], [4, [5, 6]]];
    const cloned = deepCloneWith(original, () => undefined);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned[1]).not.toBe(original[1]);
    expect(cloned[2]).not.toBe(original[2]);
    expect((cloned[2] as any)[1]).not.toBe((original[2] as any)[1]);
  });

  it('should deep clone objects', () => {
    const original = {
      a: 1,
      b: { c: 2 },
      d: { e: { f: 3 } },
    };
    const cloned = deepCloneWith(original, noop);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.b).not.toBe(original.b);
    expect(cloned.d).not.toBe(original.d);
    expect(cloned.d.e).not.toBe(original.d.e);
  });

  it('should handle circular references', () => {
    const original: any = {
      a: 1,
    };
    original.self = original;

    const cloned = deepCloneWith(original, () => undefined);

    expect(cloned.a).toBe(1);
    expect(cloned.self).toBe(cloned);
  });

  it('should pass correct arguments to customizer', () => {
    const calls: any[] = [];
    const obj = { a: 1, b: { c: 2 } };

    deepCloneWith(obj, (value, key, object, stack) => {
      calls.push({ value, key, object, hasStack: stack instanceof Map });
      return undefined;
    });

    expect(calls[0]).toEqual({
      value: obj,
      key: undefined,
      object: obj,
      hasStack: true,
    });

    expect(calls[1]).toEqual({
      value: 1,
      key: 'a',
      object: obj,
      hasStack: true,
    });

    expect(calls[2]).toEqual({
      value: obj.b,
      key: 'b',
      object: obj,
      hasStack: true,
    });
  });

  it('should allow customizer to modify values', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const customizer = (value: any) => {
      if (typeof value === 'number') {
        return value * 2;
      }
    };

    const cloned = deepCloneWith(obj, customizer);

    expect(cloned).toEqual({ a: 2, b: 4, c: 6 });
  });

  it('should allow customizer to skip cloning for certain values', () => {
    const obj = { a: 1, b: { c: 2 } };
    const customizer = (value: any) => {
      if (typeof value === 'object') {
        return value;
      }
    };

    const cloned = deepCloneWith(obj, customizer);

    expect(cloned).toBe(obj);
  });

  it('should allow customizer to replace values', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const customizer = (value: any) => {
      if (value === 2) {
        return 42;
      }
    };

    const cloned = deepCloneWith(obj, customizer);

    expect(cloned).toEqual({ a: 1, b: 42, c: 3 });
  });

  it('should allow customizer to replace values with null', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const customizer = (value: any) => {
      if (value === 3) {
        return null;
      }
    };

    const cloned = deepCloneWith(obj, customizer);

    expect(cloned).toEqual({ a: 1, b: 2, c: null });
  });

  it('should allow customizer to handle arrays', () => {
    const arr = [1, 2, 3];
    const customizer = (value: any) => {
      if (Array.isArray(value)) {
        return value.map(v => v + 1);
      }
    };

    const cloned = deepCloneWith(arr, customizer);

    expect(cloned).toEqual([2, 3, 4]);
  });

  it('should allow customizer to handle nested objects', () => {
    const obj = { a: 1, b: { c: 2, d: { e: 3 } } };
    const customizer = (value: any) => {
      if (typeof value === 'number') {
        return value * 2;
      }
    };

    const cloned = deepCloneWith(obj, customizer);

    expect(cloned).toEqual({ a: 2, b: { c: 4, d: { e: 6 } } });
  });

  it('clones the Error cause instead of sharing it', () => {
    const cause = { a: 1 };
    const cloned = deepCloneWith({ err: new Error('x', { cause }) }, noop);
    expect(cloned.err.cause).toEqual(cause);
    expect(cloned.err.cause).not.toBe(cause);
  });

  it('returns objects with a user-defined Symbol.toStringTag by reference', () => {
    class Tagged {
      value = 1;
      get [Symbol.toStringTag]() {
        return 'Tagged';
      }
    }
    const original = new Tagged();
    const cloned = deepCloneWith({ tagged: original }, noop);
    expect(cloned.tagged).toBe(original);
  });

  it('returns exotic builtins such as Promise by reference', () => {
    const promise = Promise.resolve(1);
    const cloned = deepCloneWith({ promise }, noop);
    expect(cloned.promise).toBe(promise);
  });

  it('gives Set members a keyless node and Map entries their key', () => {
    const paths: string[] = [];
    const customizer: WithCustomizer = (value, key, _obj, _stack, parent) => {
      if (typeof value !== 'number') return;

      const segments: string[] = [String(key)];

      for (let node = parent; node; node = node.parent) {
        segments.unshift(node.key === undefined ? '<none>' : String(node.key));
      }

      paths.push(segments.join('.'));
    };

    deepCloneWith(
      { s: new Set([{ a: 1 }]), m: new Map([['k', { b: 2 }]]) },
      customizer,
    );

    expect(paths).toEqual(['<none>.s.<none>.a', '<none>.m.k.b']);
  });

  it('passes the parent chain of the value as the fifth customizer argument', () => {
    const paths: string[] = [];
    const customizer: WithCustomizer = (value, key, _obj, _stack, parent) => {
      if (typeof value !== 'number') return;

      const segments: PropertyKey[] = [key!];

      for (let node = parent; node; node = node.parent) {
        if (node.key !== undefined) segments.unshift(node.key);
      }

      paths.push(segments.map(String).join('.'));
    };

    deepCloneWith(
      { a: { b: 1, c: [{ d: 2 }], e: new Map([['f', 3]]) } },
      customizer,
    );

    expect(paths).toEqual(['a.b', 'a.c.0.d', 'a.e.f']);
  });
});
