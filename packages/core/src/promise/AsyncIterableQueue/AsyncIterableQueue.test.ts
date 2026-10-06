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
  it('close ends every consumer that is waiting', async () => {
    const queue = new AsyncIterableQueue<number>();
    const first = queue[Symbol.asyncIterator]().next();
    const second = queue[Symbol.asyncIterator]().next();

    queue.close();

    const result = await Promise.race([
      Promise.all([first, second]),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 50)),
    ]);

    expect(result).toEqual([
      { value: undefined, done: true },
      { value: undefined, done: true },
    ]);
    expect((queue as any)._queue.items).toEqual([]);
  });

  it('close after buffered items ends consumers once the items are read', async () => {
    const queue = new AsyncIterableQueue<number>();
    const iterator = queue[Symbol.asyncIterator]();

    queue.put(1);
    queue.put(2);
    queue.close();

    expect(await iterator.next()).toEqual({ value: 1, done: false });
    expect(await iterator.next()).toEqual({ value: 2, done: false });
    expect(await iterator.next()).toEqual({ value: undefined, done: true });
    expect(await iterator.next()).toEqual({ value: undefined, done: true });
  });
  it('size counts buffered items without the end marker', async () => {
    const queue = new AsyncIterableQueue<number>();
    const iterator = queue[Symbol.asyncIterator]();

    expect(queue.size).toBe(0);

    queue.put(1);
    queue.put(2);
    expect(queue.size).toBe(2);

    queue.close();
    expect(queue.size).toBe(2);

    await iterator.next();
    await iterator.next();
    expect(queue.size).toBe(0);
  });
});
