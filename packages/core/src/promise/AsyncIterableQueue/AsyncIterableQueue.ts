import { Queue } from '../Queue';

/**
 * @example
 * const textStream = new AsyncIterableQueue<string>();
 *
 * const readTimer = setInterval(() => {
 *   textStream.put('Hey ' + Math.random());
 * }, 100);
 *
 * setTimeout(() => {
 *   textStream.close();
 *   clearInterval(readTimer);
 * });
 *
 * for await (const text of textStream) {
 *   console.log('text part', { text });
 * }
 *
 * @group Promise
 */
export class AsyncIterableQueue<T> implements AsyncIterable<T> {
  private queue: Queue<T | typeof AsyncIterableQueue.QUEUE_END_MARKER>;
  private closed = false;
  private static readonly QUEUE_END_MARKER = Symbol('QUEUE_END_MARKER');

  constructor() {
    this.queue = new Queue<T | typeof AsyncIterableQueue.QUEUE_END_MARKER>();
  }

  put(item: T): void {
    if (this.closed) {
      throw new Error('Queue is closed');
    }
    this.queue.put(item);
  }

  close(): void {
    this.closed = true;
    this.queue.put(AsyncIterableQueue.QUEUE_END_MARKER);
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: async (): Promise<IteratorResult<T>> => {
        if (this.closed && this.queue.items.length === 0) {
          return { value: undefined, done: true };
        }
        const item = await this.queue.get();
        if (item === AsyncIterableQueue.QUEUE_END_MARKER && this.closed) {
          return { value: undefined, done: true };
        }
        return { value: item as T, done: false };
      },
    };
  }
}
