import { describe, expect, it } from 'vitest';
import { nextTickIteration } from './nextTickIteration';

describe('nextTickIteration', () => {
  it('tick waited', async () => {
    const cooldown = nextTickIteration(4);

    let value = 0;

    await Promise.all([
      cooldown().then(() => value++),
      cooldown().then(() => value++),
      cooldown().then(() => value++),
    ]);

    cooldown().then(() => value++);

    await Promise.resolve();

    expect(value).toBe(3);
  });

  it('ms waited', async () => {
    const cooldown = nextTickIteration(4, 2);

    let value = 0;

    await Promise.all([
      cooldown().then(() => value++),
      cooldown().then(() => value++),
      cooldown().then(() => value++),
    ]);

    cooldown().then(() => value++);

    await new Promise(resolve => setTimeout(resolve, 1));

    expect(value).toBe(3);
  });
});
