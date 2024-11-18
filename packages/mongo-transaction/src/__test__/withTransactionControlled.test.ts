import { defer, noop } from '@andrew_l/toolkit';
import { describe, expect, it } from 'vitest';
import { withTransactionControlled } from '../withTransactionControlled';

describe('withTransactionControlled', () => {
  it('should returns undefined but provides .result', async () => {
    const t = withTransactionControlled(() => {
      return 5;
    });

    await expect(t.run()).resolves.toBe(undefined);
    expect(t.result).toBe(5);
  });

  it('should returns undefined from async but provide .result', async () => {
    const t = withTransactionControlled(() => {
      return new Promise(resolve => setTimeout(() => resolve(5), 10));
    });

    await expect(t.run()).resolves.toBe(undefined);
    expect(t.result).toBe(5);
  });

  it('should handle function arguments', async () => {
    const t = withTransactionControlled((...args: any[]) => {
      return args;
    });

    await t.run(1, 2, 3);

    expect(t.result).toStrictEqual([1, 2, 3]);
  });

  it('should handle function this', async () => {
    const obj = {};
    const t = withTransactionControlled(function () {
      return this;
    });

    await t.run.call(obj);

    expect(t.result).toBe(obj);
  });

  it('should handle this undefined by default', async () => {
    let thisReceived: any;

    const t = withTransactionControlled(function (this: any) {
      thisReceived = this;
    });

    await t.run();
    expect(thisReceived).toBe(undefined);
  });

  it('should returns undefined but provide .error', async () => {
    const t = withTransactionControlled(() => {
      throw new Error('test');
    });

    await expect(t.run()).resolves.toBe(undefined);
    expect(t.result).toBe(undefined);
    expect(() => {
      throw t.error;
    }).toThrowError('test');
  });

  describe('should throw error when transaction active', () => {
    const t = withTransactionControlled(() => {
      return new Promise(noop);
    });

    t.run();

    it('.run', () => {
      expect(() => t.run()).rejects.toThrowError('active');
    });

    it('.commit', () => {
      expect(() => t.commit()).rejects.toThrowError('active');
    });

    it('.rollback', () => {
      expect(() => t.rollback()).rejects.toThrowError('active');
    });
  });

  it('should throw error when commit failed execution', async () => {
    const t = withTransactionControlled(() => {
      throw new Error('test');
    });

    await t.run();
    expect(() => t.commit()).rejects.toThrowError('test');
  });

  it('should handle active flag', async () => {
    const q = defer();

    const t = withTransactionControlled(() => q.promise);

    expect(t.active).toBe(false);
    const task = t.run();
    expect(t.active).toBe(true);
    q.resolve();
    await task;
    expect(t.active).toBe(false);
  });
});
