/**
 * A basic FIFO queue with an optional limit and waiting `get` / `put`.
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
  #getters: ((item: T) => void)[] = [];
  #putters: (() => void)[] = [];

  constructor(limit?: number) {
    this.#limit = limit;
  }

  /** @internal */
  get waiting(): number {
    return this.#getters.length;
  }

  get(): Promise<T> {
    if (this.items.length === 0) {
      return new Promise<T>(resolve => {
        this.#getters.push(resolve);
      });
    }

    var item = this.items.shift()!;
    var putter = this.#putters.shift();

    if (putter !== undefined) putter();

    return Promise.resolve(item);
  }

  put(item: T): Promise<void> {
    var getter = this.#getters.shift();

    if (getter !== undefined) {
      getter(item);
      return Promise.resolve();
    }

    if (this.#limit && this.items.length >= this.#limit) {
      return new Promise<void>(resolve => {
        this.#putters.push(() => {
          this.items.push(item);
          resolve();
        });
      });
    }

    this.items.push(item);

    return Promise.resolve();
  }
}
