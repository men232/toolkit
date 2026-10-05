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
  it('hands each item to one waiting getter in order', async () => {
    const queue = new Queue<string>();

    const first = queue.get();
    const second = queue.get();

    queue.put('a');
    queue.put('b');

    expect(await Promise.all([first, second])).toEqual(['a', 'b']);
  });

  it('keeps extra getters waiting until the next put', async () => {
    const queue = new Queue<string>();
    const results: string[] = [];

    queue.get().then(v => results.push(v));
    queue.get().then(v => results.push(v));

    queue.put('a');
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(results).toEqual(['a']);

    queue.put('b');
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(results).toEqual(['a', 'b']);
  });

  it('wakes one waiting putter per get and never exceeds the limit', async () => {
    const queue = new Queue<string>(1);
    const resolved: string[] = [];

    await queue.put('a');
    queue.put('b').then(() => resolved.push('b'));
    queue.put('c').then(() => resolved.push('c'));

    expect(await queue.get()).toBe('a');
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(resolved).toEqual(['b']);
    expect(queue.items).toEqual(['b']);

    expect(await queue.get()).toBe('b');
    expect(await queue.get()).toBe('c');
    expect(resolved).toEqual(['b', 'c']);
  });
});
