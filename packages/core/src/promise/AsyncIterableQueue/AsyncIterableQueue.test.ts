import { catchError } from '@/catchError';
import { describe, expect, it } from 'vitest';
import { AsyncIterableQueue } from './AsyncIterableQueue';

describe('AsyncIterableQueue', () => {
  it('closed is true after calling .close()', () => {
    const queue = new AsyncIterableQueue();

    expect(queue.closed).toBe(false);

    queue.close();

    expect(queue.closed).toBe(true);
  });

  it('cannot put item after close', () => {
    const queue = new AsyncIterableQueue();

    queue.close();

    const [err] = catchError(() => {
      queue.put(1);
    });

    expect(err?.message).toBe('Queue is closed');
  });

  it('what we put is what we got', async () => {
    const queue = new AsyncIterableQueue();

    const itemsToPut = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const itemsWeGet = [];

    itemsToPut.forEach(item => queue.put(item));

    queue.close();

    for await (const item of queue) {
      itemsWeGet.push(item);
    }

    expect(itemsToPut).toEqual(itemsWeGet);
  });

  it('await must resolves only after close', async () => {
    const queue = new AsyncIterableQueue();

    setTimeout(() => {
      queue.close();
    }, 100);

    for await (const item of queue) {
      console.info(item);
    }

    expect(queue.closed).toBe(true);
  });
});
