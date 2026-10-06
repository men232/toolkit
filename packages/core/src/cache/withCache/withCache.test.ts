import { describe, expect, test } from 'vitest';
import { withCache } from './withCache';

describe('withCache', () => {
  test('rnd must returns the same result', () => {
    const rnd = withCache(() => Math.random());

    expect(rnd()).toBe(rnd());
  });

  test('should keep this context', () => {
    const fn = withCache(function (this: any) {
      return this;
    });

    const context = Symbol();

    expect(fn.call(context)).toBe(context);
  });

  test('object arguments must be handled (strategy: ref)', () => {
    const user = { id: 1, name: 'Andrew L.' };

    let called = 0;

    const getUserName = withCache(
      { objectStrategy: 'ref' },
      (user: { id: number; name: string }) => {
        called++;
        return user.name;
      },
    );

    getUserName(user);
    getUserName(user);
    getUserName(user);
    expect(called).toBe(1);

    getUserName({ id: 1, name: 'Andrew L.' });
    expect(called).toBe(2);
  });

  test('object arguments must be handled (strategy: json)', () => {
    const user = { id: 1, name: 'Andrew L.' };

    let called = 0;

    const getUserName = withCache(
      { objectStrategy: 'json' },
      (user: { id: number; name: string }) => {
        called++;
        return user.name;
      },
    );

    getUserName({ id: 1, name: 'Andrew L.' });
    getUserName({ id: 1, name: 'Andrew L.' });
    getUserName({ id: 1, name: 'Andrew L.' });
    expect(called).toBe(1);
  });

  test('cache pointer', () => {
    const cachePointer = Symbol();

    let called = 0;

    const getUserName = withCache(
      { cachePointer },
      (user: { id: number; name: string }) => {
        called++;
        return user.name;
      },
    );

    const getUserName2 = withCache(
      { cachePointer },
      (user: { id: number; name: string }) => {
        called++;
        return user.name;
      },
    );

    const user = { id: 1, name: 'Andrew L.' };

    getUserName(user);
    getUserName(user);
    getUserName2(user);
    getUserName2(user);

    expect(called).toBe(1);
  });
  test('should not mix up arguments of different types', () => {
    let called = 0;
    const fn = withCache((...args: unknown[]) => {
      called++;
      return args;
    });

    const variants: unknown[][] = [
      [1],
      ['1'],
      [true],
      ['true'],
      [null],
      ['null'],
      [undefined],
      ['undefined'],
      [1n],
      [[1]],
      [],
      [''],
    ];

    for (const args of variants) {
      expect(fn(...args)).toStrictEqual(args);
    }

    expect(called).toBe(variants.length);
  });

  test('should not mix up arguments containing separators', () => {
    let called = 0;
    const fn = withCache((...args: unknown[]) => {
      called++;
      return args;
    });

    const variants: unknown[][] = [
      ['a_b'],
      ['a', 'b'],
      [['a/b']],
      [['a', 'b']],
      [['a'], 'b'],
    ];

    for (const args of variants) {
      expect(fn(...args)).toStrictEqual(args);
    }

    expect(called).toBe(variants.length);
  });

  test('should distinguish dates by milliseconds', () => {
    const fn = withCache((date: Date) => date.getTime());

    expect(fn(new Date(1000))).toBe(1000);
    expect(fn(new Date(1001))).toBe(1001);
    expect(fn(new Date(1001))).toBe(1001);
  });

  test('should distinguish functions with the same source', () => {
    const make = (value: number) => () => value;
    const fn = withCache((cb: () => number) => cb());

    expect(fn(make(1))).toBe(1);
    expect(fn(make(2))).toBe(2);
  });
  test('should keep returning a promise for a function that returns one without async', async () => {
    const load = withCache((id: number) => Promise.resolve({ id }));

    const first = load(1);
    expect(first).toBeInstanceOf(Promise);
    expect(await first).toEqual({ id: 1 });

    const hit = load(1);
    expect(hit).toBeInstanceOf(Promise);
    expect(await hit).toEqual({ id: 1 });
  });
});
