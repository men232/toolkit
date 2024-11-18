import { defer, noop } from '@andrew_l/toolkit';
import { describe, expect, it } from 'vitest';
import { createTransactionScope } from '../scope';

describe('scope', () => {
  describe('default state', () => {
    const t = createTransactionScope(noop);

    it('not active', () => expect(t.active).toBe(false));
    it('no result', () => expect(t.result).toBe(undefined));
    it('no error', () => expect(t.error).toBe(undefined));
  });

  describe('.run', () => {
    it('should returns undefined when success', async () => {
      const t = createTransactionScope(() => {
        return 5;
      });

      await expect(t.run()).resolves.toBe(undefined);
    });

    it('should returns undefined when error', async () => {
      const t = createTransactionScope(() => {
        throw new Error('test');
      });

      await expect(t.run()).resolves.toBe(undefined);
    });

    it('should handle function arguments', async () => {
      const argumentPassed = [1, 2, 3];
      let argumentReceived: any;

      const t = createTransactionScope((...args: any[]) => {
        argumentReceived = args;
      });

      await t.run(...argumentPassed);
      expect(argumentReceived).toStrictEqual(argumentPassed);
    });

    it('should handle function this', async () => {
      const thisPassed = {};
      let thisReceived: any;

      const t = createTransactionScope(function (this: any) {
        thisReceived = this;
      });

      await t.run.call(thisPassed);
      expect(thisReceived).toBe(thisPassed);
    });

    it('should handle this undefined by default', async () => {
      let thisReceived: any;

      const t = createTransactionScope(function (this: any) {
        thisReceived = this;
      });

      await t.run();
      expect(thisReceived).toBe(undefined);
    });
  });

  describe('.result', () => {
    it('should handle regular function', async () => {
      const t = await createTransactionScope(() => 1);
      await t.run();
      expect(t.result).toBe(1);
    });

    it('should handle async function', async () => {
      const t = await createTransactionScope(() => Promise.resolve(1));
      await t.run();
      expect(t.result).toBe(1);
    });

    it('should be undefined when error', async () => {
      const t = await createTransactionScope(() => Promise.reject(1));
      await t.run();
      expect(t.result).toBe(undefined);
    });
  });

  describe('.error', () => {
    it('should handle regular function', async () => {
      const toThrow = new Error('test');
      const t = await createTransactionScope(() => {
        throw toThrow;
      });

      await t.run();
      expect(t.error).toBe(toThrow);
    });

    it('should handle async function', async () => {
      const toThrow = new Error('test');
      const t = await createTransactionScope(() => Promise.reject(toThrow));

      await t.run();
      expect(t.error).toBe(toThrow);
    });

    it('should be undefined when success', async () => {
      const t = await createTransactionScope(() => Promise.resolve(1));
      await t.run();
      expect(t.error).toBe(undefined);
    });
  });

  describe('.active', () => {
    it('should handle active flag', async () => {
      const q = defer();

      const t = createTransactionScope(() => q.promise);

      expect(t.active).toBe(false);
      const task = t.run();
      expect(t.active).toBe(true);
      q.resolve();
      await task;
      expect(t.active).toBe(false);
    });
  });

  describe('.commit', () => {
    it('should throw error when main function failed', async () => {
      const t = createTransactionScope(() => Promise.reject(new Error('test')));

      await t.run();

      expect(() => t.commit()).rejects.toThrowError('test');
    });
  });

  describe('should throw error when transaction active', () => {
    const t = createTransactionScope(() => {
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

    it('.clean', () => {
      expect(() => t.clean()).toThrowError('active');
    });

    it('.reset', () => {
      expect(() => t.reset()).toThrowError('active');
    });
  });
});
