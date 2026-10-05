import { noopLogger } from '@andrew_l/toolkit';
import { describe, expect, it, vi } from 'vitest';
import { onRollback, useTransactionEffect } from '../hooks';
import { withTransaction } from '../withTransaction';

describe('withTransaction', () => {
  it('should returns function result', () => {
    const run = withTransaction(() => {
      return 5;
    });

    expect(run()).resolves.toBe(5);
  });

  it('should returns function async result', () => {
    const run = withTransaction(() => {
      return new Promise<number>(resolve => setTimeout(() => resolve(5), 10));
    });

    expect(run()).resolves.toBe(5);
  });

  it('should handle function arguments', async () => {
    const argsPassed = [1, 2, 3, 4];
    let argsReceived: any;

    const run = withTransaction((...args: any[]) => {
      argsReceived = args;
    });

    await run(...argsPassed);

    expect(argsReceived).toStrictEqual(argsPassed);
  });

  it('should handle function this', async () => {
    const thisPassed = {};
    let thisReceived: any;

    const run = withTransaction(function () {
      thisReceived = this;
    });

    await run.call(thisPassed);

    expect(thisPassed).toBe(thisReceived);
  });

  it('should handle this undefined by default', async () => {
    let thisReceived: any;

    const run = withTransaction(function (this: any) {
      thisReceived = this;
    });

    await run();
    expect(thisReceived).toBe(undefined);
  });

  it('should handle max retries option', async () => {
    let executes = 0;
    const maxAttempts = 3;

    const run = withTransaction(
      function (this: any) {
        executes++;
        throw new Error('test');
      },
      { maxAttempts },
    );

    await expect(() => run()).rejects.toThrowError('test');
    expect(executes).toBe(maxAttempts);
  });

  it('should log effect error to the provided logger', async () => {
    const effectError = new Error('apply failed');
    const logError = vi.fn();

    const run = withTransaction(
      async () => {
        await useTransactionEffect(() => Promise.reject(effectError));
      },
      { maxAttempts: 1, logger: { ...noopLogger, error: logError } },
    );

    await expect(run()).rejects.toBe(effectError);
    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError.mock.calls[0]).toContain(effectError);
  });

  it('should reject with the function error when effect cleanup fails', async () => {
    let rolledBack = false;

    const run = withTransaction(
      async () => {
        await useTransactionEffect(() => () => {
          throw new Error('cleanup failed');
        });
        onRollback(() => void (rolledBack = true));

        throw new Error('rollback me');
      },
      { maxAttempts: 1, logger: noopLogger },
    );

    await expect(run()).rejects.toThrowError('rollback me');
    expect(rolledBack).toBe(true);
  });
});
