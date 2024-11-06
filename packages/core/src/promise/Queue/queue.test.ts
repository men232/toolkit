import { describe, expect, it } from 'vitest';
import { Queue } from './Queue';

describe('Queue', () => {
  it('get / put', async () => {
    const queue = new Queue(4);
    const value = Symbol();

    await queue.put(value);

    expect(await queue.get()).toBe(value);
  });

  it('put promise resolved when have a space', async () => {
    const queue = new Queue(1);
    const value = Symbol();

    let valueGarbed = false;

    setTimeout(() => {
      valueGarbed = true;
      queue.get();
    }, 10);

    await queue.put(value);
    await queue.put(value);

    expect(valueGarbed).toBe(true);
  });

  it('get promise resolves when have an item', async () => {
    const queue = new Queue(1);
    const value = Symbol();

    let valueInserted = false;

    setTimeout(() => {
      valueInserted = true;
      queue.put(value);
    }, 10);

    await queue.get();

    expect(valueInserted).toBe(true);
  });
});
