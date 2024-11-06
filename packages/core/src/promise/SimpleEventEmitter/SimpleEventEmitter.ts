import { isPromise } from '@/is';
import type { AnyFunction } from '@/types';
import { defer } from '../defer';

export type SimpleEventMap<T> = Record<keyof T, any[]> | SimpleDefaultEventMap;
export type SimpleDefaultEventMap = [never];

type Key<K, T> = T extends SimpleDefaultEventMap
  ? string | symbol
  : K | keyof T;

type Listener<K, T, F> = T extends SimpleDefaultEventMap
  ? F
  : K extends keyof T
    ? T[K] extends unknown[]
      ? (...args: T[K]) => void
      : never
    : never;

type Listener1<K, T> = Listener<K, T, (...args: any[]) => void>;

type Args<K, T> = T extends SimpleDefaultEventMap
  ? [...args: any[]]
  : K extends keyof T
    ? T[K]
    : never;

const onError = (error: unknown) => {
  console.error(error);
};

/**
 * Simplified version on nodejs `EventEmitter` but platform agnostic
 *
 * @example
 * const emitter = new SimpleEventEmitter();
 *
 * emitter.on('message', (data) => {
 *   console.log('msg', data)
 * });
 *
 * emitter.once('message', (data) => {
 *   console.log('once msg', data)
 * });
 *
 * emitter.emit('message', { text: 'Hello' });
 * emitter.emit('message', { text: 'Hello 2' });
 *
 * @group Promise
 */
export class SimpleEventEmitter<
  T extends SimpleEventMap<T> = SimpleDefaultEventMap,
> {
  #listeners: Map<any, Set<AnyFunction>> = new Map();

  constructor() {
    // @ts-expect-error
    this.on('error', onError);
  }

  static once(
    emitter: SimpleEventEmitter,
    eventName: string | symbol,
  ): Promise<any[]> {
    const q = defer<any[]>();

    emitter.once(eventName, (...args: any[]) => q.resolve(args));

    return q.promise;
  }

  emit<K>(eventName: Key<K, T>, ...args: Args<K, T>): boolean {
    const set = this.#listeners.get(eventName);

    if (!set) return false;

    set.forEach(fn => {
      try {
        const result = fn();

        if (isPromise(result)) {
          result.catch(err => {
            // @ts-expect-error
            this.emit('error' as any, err);
          });
        }
      } catch (err) {
        // @ts-expect-error
        this.emit('error' as any, err);
      }
    });

    return true;
  }

  on<K>(eventName: Key<K, T>, listener: Listener1<K, T>): this {
    if (!this.#listeners.has(eventName)) {
      this.#listeners.set(eventName, new Set());
    }

    const set = this.#listeners.get(eventName)!;

    set.add(listener);

    return this;
  }

  once<K>(eventName: Key<K, T>, listener: Listener1<K, T>): this {
    const wrapped = (...args: any[]) => {
      // @ts-expect-error
      this.off(eventName, wrapped);
      listener(...args);
    };

    // @ts-expect-error
    this.on(eventName, wrapped);

    return this;
  }

  off<K>(eventName: Key<K, T>, listener: Listener1<K, T>): this {
    const set = this.#listeners.get(eventName);

    if (set) {
      set.delete(listener);

      if (set.size === 0) {
        this.#listeners.delete(eventName);
      }
    }

    return this;
  }

  removeAllListeners(eventName?: Key<unknown, T>): this {
    if (eventName === undefined) {
      this.#listeners.clear();
      return this;
    }

    this.#listeners.delete(eventName);

    return this;
  }
}
