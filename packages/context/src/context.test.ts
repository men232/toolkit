import { describe, expect, test } from 'vitest';
import {
  bindContext,
  getCurrentInstance,
  inject,
  provide,
  withContext,
} from '.';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('withContext', () => {
  test('has instance - first level async', async () => {
    const result = await withContext(async () => {
      await wait(10);
      return !!getCurrentInstance();
    })();

    expect(result).toBe(true);
  });

  test('has instance - second level async', async () => {
    const level2 = async () => {
      await wait(10);
      return getCurrentInstance();
    };

    const result = await withContext(async () => {
      await wait(10);
      return getCurrentInstance() === (await level2());
    })();

    expect(result).toBe(true);
  });

  test('provide/inject', async () => {
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

  test('second context should to affect to parent', async () => {
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

  test('isolated context', async () => {
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
});
