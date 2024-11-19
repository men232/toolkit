import { describe, expect, it } from 'vitest';
import { useTransactionEffect } from '../hooks';
import { createTransactionScope } from '../scope';

describe('useTransactionEffect', () => {
  it('should execute immediately (flush: pre)', async () => {
    const t = createTransactionScope(async () => {
      let effects = 0;

      await useTransactionEffect(() => void effects++);

      return effects;
    });

    await t.run();

    expect(t.result).toBe(1);
  });

  it('should execute after main function (flush: post)', async () => {
    let effects = 0;

    const t = createTransactionScope(async () => {
      await useTransactionEffect(() => void effects++, { flush: 'post' });
      return effects;
    });

    await t.run();

    expect(t.result).toBe(0);
    expect(effects).toBe(1);
  });

  it('should make error when failed (flush: pre)', async () => {
    const toThrow = new Error('Effect error');
    const t = createTransactionScope(async () => {
      await useTransactionEffect(() => Promise.reject(toThrow));
    });

    await t.run();

    expect(t.error).toBe(toThrow);
  });

  it('should make error when failed (flush: post)', async () => {
    const toThrow = new Error('Effect error');
    const t = createTransactionScope(async () => {
      await useTransactionEffect(() => Promise.reject(toThrow), {
        flush: 'post',
      });
    });

    await t.run();

    expect(t.error).toBe(toThrow);
  });

  it('should execute once while reruns', async () => {
    let executes = 0;
    let effects = 0;

    const t = createTransactionScope(async () => {
      executes++;

      await useTransactionEffect(
        () => {
          effects++;
        },
        { flush: 'pre' },
      );
    });

    await t.run();
    await t.run();
    await t.run();

    expect(executes).toBe(3);
    expect(effects).toBe(1);
  });

  it('should cleanup when rollback', async () => {
    let executes = 0;
    let cleanups = 0;
    let effects = 0;

    const t = createTransactionScope(async () => {
      executes++;

      await useTransactionEffect(
        () => {
          effects++;
          return () => void cleanups++;
        },
        { flush: 'pre' },
      );

      throw new Error('test error');
    });

    await t.run();
    await t.run();
    await t.rollback();

    expect(executes).toBe(2);
    expect(effects).toBe(1);
    expect(cleanups).toBe(1);
  });

  it('should reruns when cleanup has been applied', async () => {
    let executes = 0;
    let cleanups = 0;

    const t = createTransactionScope(async (throwErr?: boolean) => {
      if (throwErr) throw new Error('test error');

      await useTransactionEffect(
        () => {
          executes++;
          return () => void cleanups++;
        },
        { flush: 'pre' },
      );
    });

    await t.run();

    expect(executes).toBe(1); // should execute effect
    expect(cleanups).toBe(0); // cleanup not triggered

    await t.run(true);

    expect(executes).toBe(1); // should not executes effect again
    expect(cleanups).toBe(0); // should not execute cleanup

    await t.rollback();
    await t.run();

    expect(executes).toBe(2); // should execute effect again
    expect(cleanups).toBe(1); // should not execute cleanup
  });

  it('should handle dependencies', async () => {
    let runs = 0;
    let executes = 0;
    let cleanups = 0;

    const t = createTransactionScope(async () => {
      const attemptNumber = ++runs;

      await useTransactionEffect(
        () => {
          executes++;
          return () => void cleanups++;
        },
        { flush: 'pre', dependencies: [attemptNumber] },
      );
    });

    await t.run();
    await t.run();
    await t.commit();

    expect(runs).toBe(2);
    expect(executes).toBe(2);
    expect(cleanups).toBe(1);
  });
});
