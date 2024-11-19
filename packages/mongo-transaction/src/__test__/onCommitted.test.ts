import { describe, expect, it } from 'vitest';
import { onCommitted } from '../hooks';
import { createTransactionScope } from '../scope';

describe('onCommitted', () => {
  it('should execute once when committed', async () => {
    let calls = 0;

    const t = await createTransactionScope(function () {
      onCommitted(() => {
        calls++;
      });
    });

    await t.run();
    await t.commit();
    await t.commit();

    expect(calls).toBe(1);
  });

  it('should skip when failed rollback', async () => {
    let calls = 0;

    const t = createTransactionScope(function () {
      onCommitted(() => {
        calls++;
      });

      throw new Error('test');
    });

    await t.run();
    await t.rollback();

    expect(calls).toBe(0);
  });

  it('should handle async callback', async () => {
    let calls = 0;

    const t = await createTransactionScope(function () {
      onCommitted(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        calls++;
      });

      return calls;
    });

    await t.run();
    expect(t.result).toBe(0);

    await t.commit();
    expect(calls).toBe(1);
  });

  it('should handle cancel', async () => {
    let calls = 0;

    const t = createTransactionScope(function () {
      const cancel = onCommitted(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        calls++;
      });

      cancel();
    });

    await t.run();
    await t.commit();

    expect(calls).toBe(0);
  });

  it('should handle dependencies', async () => {
    let hookValue = 0;
    let executes = 0;

    const t = createTransactionScope(function () {
      const executionAttempt = ++executes;

      onCommitted(() => {
        hookValue = executionAttempt;
      }, []);
    });

    await t.run();
    await t.run();
    await t.commit();

    expect(executes).toBe(2);
    expect(hookValue).toBe(1);
  });
});
