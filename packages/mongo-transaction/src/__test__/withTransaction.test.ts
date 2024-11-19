import { describe, expect, it } from 'vitest';
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
    const maxRetriesNumber = 3;

    const run = withTransaction(
      function (this: any) {
        executes++;
        throw new Error('test');
      },
      { maxRetriesNumber: 3 },
    );

    await expect(() => run()).rejects.toThrowError('test');
    expect(executes).toBe(maxRetriesNumber);
  });
});
