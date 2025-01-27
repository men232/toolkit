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
});
