import { describe, expect, it } from 'vitest';
import { fastIdle, fastIdlePromise } from './fastIdle';

describe('fastIdle', () => {
  it('callback executes', async () => {
    let called = 0;

    await new Promise<void>(resolve => {
      fastIdle(() => {
        called++;
        resolve();
      });
    });

    expect(called).toBe(1);
  });
});

describe('fastIdlePromise', () => {
  it('resolved', async () => {
    await fastIdlePromise();

    expect(true).toBe(true);
  });
});
