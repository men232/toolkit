import { describe, expect, it } from 'vitest';
import { CancellablePromise } from './CancellablePromise';

describe('CancellablePromise', () => {
  it('initial state', () => {
    const p = new CancellablePromise(() => {});

    expect(p.isCancelled).toBe(false);
    expect(p.error).toBe(null);
    expect(p.toString()).toBe('[object Promise]');
  });

  it('isCancelled must be true after calling .cancel()', () => {
    const p = new CancellablePromise((resolve, reject) => {});

    expect(p.isCancelled).toBe(false);

    p.cancel();

    expect(p.isCancelled).toBe(true);
  });

  it('.cancel() must invoke onCancel handlers once', () => {
    let called = 0;

    const p = new CancellablePromise((resolve, reject, onCancel) => {
      onCancel(() => called++);
    });

    p.cancel();
    p.cancel();

    expect(called).toBe(1);
  });

  it('reject must saves error', () => {
    const rejectError = new Error();

    const p = new CancellablePromise((resolve, reject, onCancel) => {
      reject(rejectError);
    });

    p.catch(() => {});

    expect(p.error).toBe(rejectError);
  });
});
