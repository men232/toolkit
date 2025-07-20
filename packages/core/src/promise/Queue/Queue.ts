import { SimpleEventEmitter } from '../SimpleEventEmitter';

/**
 * A basic queue implementation with a limit and event-based synchronization.
 *
 * This class allows you to put items into a queue and retrieve them asynchronously.
 * If the queue exceeds a specified limit, the `put` operation will wait until an item is retrieved,
 * and similarly, the `get` operation will wait if there are no items available in the queue.
 *
 * @example
 * // Create a queue with a limit of 10 items
 * const sendQueue = new Queue<any>(10);
 *
 * // Add items to the queue
 * sendQueue.put({ url: '/api/message.send', params: { text: 'hello' } });
 * sendQueue.put({ url: '/api/message.send', params: { text: 'how are you?' } });
 *
 * // Retrieve and process items from the queue asynchronously
 * while (true) {
 *   const req = await sendQueue.get();
 *   http.post(req.url, { body: req.params });
 * }
 *
 * @param limit - Optional maximum number of items the queue can hold. If not provided, the queue has no limit.
 *
 * @group Promise
 */
export class Queue<T> {
  items: T[] = [];
  #limit?: number;
  #events = new SimpleEventEmitter();

  constructor(limit?: number) {
    this.#limit = limit;
  }

  get(): Promise<T> {
    var getItem = (): Promise<T> => {
      const item = this.items.shift()!;
      this.#events.emit('get');
      return Promise.resolve(item);
    };

    if (this.items.length === 0) {
      return SimpleEventEmitter.once(this.#events, 'put').then(getItem);
    }

    return getItem();
  }

  put(item: T): Promise<void> {
    var putItem = (): Promise<void> => {
      this.items.push(item);
      this.#events.emit('put');
      return Promise.resolve();
    };

    if (this.#limit && this.items.length >= this.#limit) {
      return SimpleEventEmitter.once(this.#events, 'get').then(putItem);
    }

    return putItem();
  }
}
