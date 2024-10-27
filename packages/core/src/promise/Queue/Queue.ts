import { SimpleEventEmitter } from '../SimpleEventEmitter';

/**
 * Basic queue implementation
 *
 * @example
 * const sendQueue = new Queue<any>(10);
 *
 * sendQueue.put({ url: '/api/message.send', params: { text: 'hello' } });
 * sendQueue.put({ url: '/api/message.send', params: { text: 'how are you?' } });
 *
 * while (true) {
 *   const req = await sendQueue.get();
 *
 *   http.post(req.url, { body: req.params });
 * }
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

  async get(): Promise<T> {
    if (this.items.length === 0) {
      await SimpleEventEmitter.once(this.#events, 'put');
    }
    const item = this.items.shift()!;
    this.#events.emit('get');
    return item;
  }

  async put(item: T) {
    if (this.#limit && this.items.length >= this.#limit) {
      await SimpleEventEmitter.once(this.#events, 'get');
    }
    this.items.push(item);
    this.#events.emit('put');
  }
}
