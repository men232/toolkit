import { describe, expect, it } from 'vitest';
import { withResolve } from './withResolve';

describe('withResolve', () => {
  it('deduplicates with same arguments (default stringifyArgs)', async () => {
    let called = 0;

    const fn = withResolve((_arg: number) => {
      called++;
      return Promise.resolve('result');
    });

    const [r1, r2] = await Promise.all([fn(1), fn(1)]);

    expect(called).toBe(1);
    expect(r1).toBe('result');
    expect(r2).toBe('result');
  });

  it('does not deduplicate different arguments', async () => {
    let called = 0;

    const fn = withResolve((_arg: number) => {
      called++;
      return Promise.resolve('result');
    });

    await Promise.all([fn(1), fn(2)]);

    expect(called).toBe(2);
  });

  it('uses getCacheKey variant even when not in cache initially', async () => {
    let called = 0;

    const fn = withResolve(
      (_obj: { id: number; name: string }) => {
        called++;
        return Promise.resolve('result');
      },
      [(args, computeKey) => computeKey(args[0]?.id)],
    );

    const [r1, r2] = await Promise.all([
      fn({ id: 1, name: 'Andrew' }),
      fn({ id: 1, name: 'John' }),
    ]);

    expect(called).toBe(1);
    expect(r1).toBe('result');
    expect(r2).toBe('result');
  });

  it('uses getCacheKey variant for parallel calls with same normalized key', async () => {
    let called = 0;

    const fn = withResolve(
      (_obj: { id: number }) => {
        called++;
        return Promise.resolve('result');
      },
      [(args, computeKey) => computeKey(args[0]?.id)],
    );

    const results = await Promise.all([fn({ id: 1 }), fn({ id: 1 })]);

    expect(called).toBe(1);
    expect(results[0]).toBe('result');
    expect(results[1]).toBe('result');
  });

  it('tries multiple getCacheKey variants and uses first found in cache', async () => {
    let called = 0;
    const variantCalls = [0, 0];

    const fn = withResolve(
      (_obj: { id: number }) => {
        called++;
        return Promise.resolve('result');
      },
      [
        (args, computeKey) => {
          variantCalls[0]++;
          return computeKey(args[0]?.id);
        },
        (args, computeKey) => {
          variantCalls[1]++;
          return computeKey(args[0]);
        },
      ],
    );

    const results = await Promise.all([fn({ id: 1 }), fn({ id: 1 })]);

    expect(called).toBe(1);
    expect(variantCalls[0]).toBeGreaterThan(0);
    expect(results[0]).toBe('result');
    expect(results[1]).toBe('result');
  });

  it('disables deduplication when getCacheKey returns null', async () => {
    let called = 0;

    const fn = withResolve(
      (_obj: { disableDedup?: boolean }) => {
        called++;
        return Promise.resolve('result');
      },
      [
        args => {
          if (args[0]?.disableDedup) {
            return null;
          }
          return 'key1';
        },
      ],
    );

    await Promise.all([fn({ disableDedup: true }), fn({ disableDedup: true })]);

    expect(called).toBe(2);
  });

  it('skips variant returning undefined and tries next', async () => {
    let called = 0;
    let variant1Calls = 0;
    let variant2Calls = 0;

    const fn = withResolve(
      (_arg: string) => {
        called++;
        return Promise.resolve('result');
      },
      [
        () => {
          variant1Calls++;
          return undefined;
        },
        (args, computeKey) => {
          variant2Calls++;
          return computeKey(args[0]);
        },
      ],
    );

    const results = await Promise.all([fn('test'), fn('test')]);

    expect(called).toBe(1);
    expect(variant1Calls).toBeGreaterThan(0);
    expect(variant2Calls).toBeGreaterThan(0);
    expect(results[0]).toBe('result');
    expect(results[1]).toBe('result');
  });

  it('normalizes different arguments to same cache key', async () => {
    let called = 0;

    const fn = withResolve(
      (id?: number, _options?: { fresh?: boolean }) => {
        called++;
        return Promise.resolve(`user_${id}`);
      },
      [
        (args, computeKey) => {
          const id = args[0];
          const options = args[1];
          if (options?.fresh) {
            return null;
          }
          return computeKey(id, {});
        },
      ],
    );

    const [r1, r2] = await Promise.all([fn(1), fn(1, { fresh: false })]);

    expect(called).toBe(1);
    expect(r1).toBe('user_1');
    expect(r2).toBe('user_1');
  });

  it('handles promises rejecting correctly with getCacheKey', async () => {
    let called = 0;

    const fn = withResolve(
      (_arg: string) => {
        called++;
        return Promise.reject(new Error('test error'));
      },
      [(args, computeKey) => computeKey(args[0])],
    );

    const [r1, r2] = await Promise.allSettled([fn('test'), fn('test')]);

    expect(called).toBe(1);
    expect(r1.status).toBe('rejected');
    expect(r2.status).toBe('rejected');
    if (r1.status === 'rejected' && r2.status === 'rejected') {
      expect(r1.reason).toBe(r2.reason);
    }
  });

  it('fallback to first valid getCacheKey when none in cache', async () => {
    let called = 0;

    const fn = withResolve(
      (_obj: { id: number }) => {
        called++;
        return Promise.resolve('result');
      },
      [(args, computeKey) => computeKey(args[0]?.id)],
    );

    const [r1, r2] = await Promise.all([fn({ id: 1 }), fn({ id: 1 })]);

    expect(called).toBe(1);
    expect(r1).toBe('result');
    expect(r2).toBe('result');
  });
});
