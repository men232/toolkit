import { describe, expect, it } from 'vitest';
import { onRollback } from '../hooks';
import { createTransactionScope } from '../scope';

describe('onRollback', () => {
  it('should skip when committed', async () => {
    let calls = 0;

    const t = createTransactionScope(function () {
      onRollback(() => {
        calls++;
      });
    });

    await t.run();
    await t.commit();

    expect(calls).toBe(0);
  });

  it('should execute once when rollback', async () => {
    let calls = 0;

    const t = await createTransactionScope(function () {
      onRollback(() => {
        calls++;
      });

      throw new Error('test');
    });

    await t.run();
    await t.rollback();
    await t.rollback();

    expect(calls).toBe(1);
  });

  it('should handle async callback', async () => {
    let calls = 0;

    const t = createTransactionScope(function () {
      onRollback(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        calls++;
      });

      return calls;
    });

    await t.run();
    expect(t.result).toBe(0);

    await t.rollback();
    expect(calls).toBe(1);
  });

  it('should handle cancel', async () => {
    let calls = 0;

    const t = createTransactionScope(function () {
      const cancel = onRollback(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        calls++;
      });

      cancel();
    });

    await t.run();
    await t.rollback();

    expect(calls).toBe(0);
  });

  it('should handle dependencies', async () => {
    let hookValue = 0;
    let executes = 0;

    const t = createTransactionScope(function () {
      const executionAttempt = ++executes;

      onRollback(() => {
        hookValue = executionAttempt;
      }, []);
    });

    await t.run();
    await t.run();
    await t.rollback();

    expect(executes).toBe(2);
    expect(hookValue).toBe(1);
  });
});
