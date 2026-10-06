import { afterEach, describe, expect, it, vi } from 'vitest';
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

describe('fastIdle environment', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('should load without a global process', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'process')!;
    vi.resetModules();

    let mod: typeof import('./fastIdle') | undefined;
    let error: unknown;

    delete (globalThis as any).process;
    try {
      mod = await import('./fastIdle');
    } catch (err) {
      error = err;
    } finally {
      Object.defineProperty(globalThis, 'process', descriptor);
    }

    expect(error).toBeUndefined();
    expect(typeof mod?.fastIdle).toBe('function');
  });
});
