import { describe, expect, it } from 'vitest';
import { fastRaf, rafPromise } from './fastRaf';

describe('fastRaf', () => {
  it('callback executes', async () => {
    let called = 0;
    await new Promise<void>(resolve => {
      fastRaf(() => {
        called++;
        resolve();
      });
    });

    expect(called).toBe(1);
  });
});

describe('rafPromise', () => {
  it('resolved', async () => {
    await rafPromise();

    expect(true).toBe(true);
  });
});
