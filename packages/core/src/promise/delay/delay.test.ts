import { describe, expect, it } from 'vitest';
import { delay } from './delay';

describe('delay', () => {
  it('tick', async () => {
    const startAt = Date.now();

    await delay('tick');

    expect(Date.now() - startAt).lessThan(5);
  });

  it('ms', async () => {
    const startAt = Date.now();

    await delay(101);

    expect(Date.now() - startAt).greaterThanOrEqual(100);
  });
});
