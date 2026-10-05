import { afterEach, describe, expect, it, vi } from 'vitest';
import { delay } from './delay';

describe('delay', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('tick', async () => {
    let microtaskDone = false;
    Promise.resolve().then(() => (microtaskDone = true));

    await delay('tick');

    expect(microtaskDone).toBe(true);
  });

  it('ms', async () => {
    vi.useFakeTimers();

    let resolved = false;
    delay(100).then(() => (resolved = true));

    await vi.advanceTimersByTimeAsync(99);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);
  });
});
