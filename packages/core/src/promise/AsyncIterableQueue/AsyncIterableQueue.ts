import { Queue } from '../Queue';

/**
 * An asynchronous queue implementation that can be iterated using an async iterator.
 * It allows items to be added (`put`) and consumed asynchronously, with the ability to signal when the queue is closed.
 * This class supports async iteration, enabling users to process items as they become available, and provides an end signal once the queue is closed.
 *
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
  private _queue: Queue<T | typeof AsyncIterableQueue.QUEUE_END_MARKER>;
  private _closed = false;
  private static readonly QUEUE_END_MARKER = Symbol('QUEUE_END_MARKER');

  constructor() {
    this._queue = new Queue<T | typeof AsyncIterableQueue.QUEUE_END_MARKER>();
  }

  get closed(): boolean {
    return this._closed;
  }

  put(item: T): void {
    if (this._closed) {
      throw new Error('Queue is closed');
    }
    this._queue.put(item);
  }

  close(): void {
    if (this._closed) return;

    this._closed = true;
    this._queue.put(AsyncIterableQueue.QUEUE_END_MARKER);
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: (): Promise<IteratorResult<T>> => {
        if (this._closed && this._queue.items.length === 0) {
          return Promise.resolve({ value: undefined, done: true });
        }

        return this._queue.get().then(item => {
          if (item === AsyncIterableQueue.QUEUE_END_MARKER && this._closed) {
            return { value: undefined, done: true };
          }
          return { value: item as T, done: false };
        });
      },
    };
  }
}
