import { describe, expect, test } from 'vitest';
import { withCacheFixed } from './withCacheFixed';

describe('withCacheFixed', () => {
  test('rnd must returns the same result', () => {
    const rnd = withCacheFixed({ capacity: 1 }, () => Math.random());

    expect(rnd()).toBe(rnd());
  });

  test('should keep this context', () => {
    const fn = withCacheFixed({ capacity: 1 }, function (this: any) {
      return this;
    });

    const context = Symbol();

    expect(fn.call(context)).toBe(context);
  });

  test('check capacity', () => {
    let called = 0;

    const rnd = withCacheFixed({ capacity: 3 }, (_: number) => {
      called++;
      return Math.random();
    });

    rnd(1);
    rnd(2);
    rnd(3);
    rnd(4);
    rnd(5);

    expect(5).toBe(called);

    // last 3 items must be cached
    rnd(3);
    rnd(4);
    rnd(5);

    expect(5).toBe(called);
  });
});
