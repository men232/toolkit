import { defer } from '@andrew_l/toolkit';
import { describe, expect, test } from 'vitest';
import {
  bindContext,
  getCurrentScope,
  inject,
  onScopeDispose,
  provide,
  withContext,
} from '.';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('withContext', () => {
  test('should keep this', async () => {
    const thisValue = Symbol();

    const fn = await withContext(function (this: any) {
      return this;
    });

    expect(fn.call(thisValue)).toBe(thisValue);
  });

  test('should keep arguments', async () => {
    const thisValue = Symbol();

    const fn = await withContext(function (this: any, ...args: any[]) {
      return args;
    });

    expect(fn(1, 2, 3, 4, 5)).toStrictEqual([1, 2, 3, 4, 5]);
  });

  test('should have context at first level async', async () => {
    const result = await withContext(async () => {
      await wait(10);
      return !!getCurrentScope();
    })();

    expect(result).toBe(true);
  });

  test('should have context at the second level async', async () => {
    const level2 = async () => {
      await wait(10);
      return getCurrentScope();
    };

    const result = await withContext(async () => {
      await wait(10);
      return getCurrentScope() === (await level2());
    })();

    expect(result).toBe(true);
  });

  test('should inject', async () => {
    const level2 = async () => {
      await wait(10);
      return inject('key1');
    };

    const result = await withContext(async () => {
      const provideValue = Symbol();

      await wait(10);

      provide('key1', provideValue);

      return provideValue === (await level2());
    })();

    expect(result).toBe(true);
  });

  test('should not affects child injection to parent context', async () => {
    const level2 = withContext(async () => {
      await wait(10);

      provide('childValue', 2);

      return inject('parentValue');
    });

    const result = await withContext(async () => {
      await wait(10);

      provide('parentValue', 1);

      return [await level2(), inject('childValue')];
    })();

    expect(result).toEqual([1, undefined]);
  });

  test('should isolate context', async () => {
    const level2 = withContext(async () => {
      await wait(10);
      provide('childValue', 2);
      return inject('parentValue');
    }, true);

    const result = await withContext(async () => {
      await wait(10);

      provide('parentValue', 1);

      return [await level2(), inject('childValue')];
    })();

    expect(result).toEqual([undefined, undefined]);
  });

  test('bindContext', async () => {
    const result = await withContext(async () => {
      await wait(10);

      provide('parentValue', 1);

      const result = await new Promise(resolve => {
        const fn = bindContext(() => {
          provide('childValue', 2);

          const value = inject('parentValue');
          resolve(value);
        });

        setTimeout(fn, 10);
      });

      return [result, inject('childValue')];
    })();

    expect(result).toEqual([1, 2]);
  });

  test('onScopeDispose', () => {
    let disposed = false;

    const result = withContext(() => {
      onScopeDispose(() => {
        disposed = true;
      });

      return disposed;
    })();

    expect(result).toEqual(false);
    expect(disposed).toEqual(true);
  });

  test('onScopeDispose when general all runs ends', async () => {
    const tack: string[] = [];

    await withContext(() => {
      onScopeDispose(() => {
        tack.push('dispose: main');
      });

      const q = defer<void>();

      setTimeout(
        bindContext(() => {
          tack.push('start: setTimeout');
          q.resolve();
        }),
        10,
      );

      return q.promise;
    })();

    expect(tack).toStrictEqual(['start: setTimeout', 'dispose: main']);
  });

  test('onScopeDispose once', async () => {
    const tack: string[] = [];
    const q = defer<void>();

    withContext(() => {
      onScopeDispose(() => {
        tack.push('disposed: main');
      });

      tack.push('start: main');

      setTimeout(
        bindContext(() => {
          onScopeDispose(() => {
            tack.push('dispose: setTimeout');
          });

          tack.push('start: setTimeout');

          q.resolve();
        }),
        10,
      );
    })();

    await q.promise;

    expect(tack).toStrictEqual([
      'start: main',
      'disposed: main',
      'start: setTimeout',
      'dispose: setTimeout',
    ]);
  });
});
