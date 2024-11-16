import { noop } from '@andrew_l/toolkit';
import { describe, expect, it } from 'vitest';
import { useTransactionEffect } from '../hooks/useTransactionEffect';
import { withTransaction } from '../withTransaction';

describe('withTransaction', () => {
  it('should returns original function result', () => {
    const run = withTransaction(() => {
      return 5;
    });

    expect(run()).resolves.toBe(5);
  });

  it('should returns original function result promise', () => {
    const run = withTransaction(() => {
      return new Promise(resolve => setTimeout(() => resolve(5), 10));
    });

    expect(run()).resolves.toBe(5);
  });

  it('should throw error when runs multiple times', () => {
    const run = withTransaction(() => {
      return new Promise(noop);
    });

    run();
    expect(() => run()).rejects.toThrowError('execution');
  });

  it('should apply effects immediately by default (flush: pre)', () => {
    const run = withTransaction(async () => {
      let result = 0;

      await useTransactionEffect(() => {
        result++;
      });

      return result;
    });

    expect(run()).resolves.toBe(1);
  });

  it('should apply effects when main function completes (flush: post)', async () => {
    let result = 0;

    const run = withTransaction(async () => {
      await useTransactionEffect(
        () => {
          result++;
        },
        { flush: 'post' },
      );

      return result;
    });

    await expect(run()).resolves.toBe(0);

    expect(result).toBe(1);
  });

  it('should throw error when effect failed (flush: pre)', async () => {
    const run = withTransaction(async () => {
      await useTransactionEffect(() =>
        Promise.reject(new Error('Effect error')),
      );
    });

    expect(() => run()).rejects.toThrowError('Effect error');
  });

  it('should throw error when effect failed (flush: post)', async () => {
    const run = withTransaction(async () => {
      await useTransactionEffect(
        () => Promise.reject(new Error('Effect error')),
        { flush: 'post' },
      );
    });

    expect(() => run()).rejects.toThrowError('Effect error');
  });

  it('should execute effect once while reruns', async () => {
    let firstEffectExecutions = 0;
    let secondEffectExecutions = 0;
    const run = withTransaction(async () => {
      await useTransactionEffect(
        () => {
          firstEffectExecutions++;
        },
        { flush: 'pre' },
      );

      await useTransactionEffect(
        () => {
          secondEffectExecutions++;
        },
        { flush: 'post' },
      );
    });

    await run();
    await run();
    await run();

    expect(firstEffectExecutions).toBe(1);
    expect(secondEffectExecutions).toBe(1);
  });

  it('should rollback effect when main function fails', async () => {
    let executes = 0;
    let rollbacks = 0;

    const run = withTransaction(async (throwErr?: boolean) => {
      await useTransactionEffect(
        () => {
          executes++;
          return () => void rollbacks++;
        },
        { flush: 'pre' },
      );

      if (throwErr) throw new Error('test error');
    });

    await run();

    expect(executes).toBe(1);
    expect(rollbacks).toBe(0);

    await expect(() => run(true)).rejects.toThrowError('test error');

    expect(executes).toBe(1);
    expect(rollbacks).toBe(1);
  });

  it('should reruns effect when rollback has been applied', async () => {
    let executes = 0;
    let rollbacks = 0;

    const run = withTransaction(async (throwErr?: boolean) => {
      if (throwErr) throw new Error('test error');

      await useTransactionEffect(
        () => {
          executes++;
          return () => void rollbacks++;
        },
        { flush: 'pre' },
      );
    });

    await run();

    expect(executes).toBe(1); // should execute effect
    expect(rollbacks).toBe(0); // rollback not triggered

    await expect(() => run(true)).rejects.toThrowError('test error');

    expect(executes).toBe(1); // should not executes effect again
    expect(rollbacks).toBe(1); // should execute rollback

    await run();

    expect(executes).toBe(2); // should execute effect again
    expect(rollbacks).toBe(1); // should not execute rollback
  });
});
