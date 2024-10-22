import { captureStackTrace, logger } from '@andrew_l/toolkit-core';
import { AsyncLocalStorage } from 'node:async_hooks';

const ALS = new AsyncLocalStorage<Map<any, any>>();

const PARENT_SYB = Symbol('app.inject.parent');

const log = logger(import.meta, 'node-inject');

export type ProvideKey = symbol | string | number | object;
export type ProvideValue<T = unknown> = T | undefined;

/**
 * Runs a function within a injection context and returns its return value. The providers/injection is not accessible outside of the callback function.
 * @param isolated Do not inject parent providers into this context (Default: `false`)
 */
export function withAppInject<T = any>(fn: () => T, isolated = false): T {
  const newStore = new Map();

  if (!isolated) {
    const currentStore = ALS.getStore();

    if (currentStore) {
      newStore.set(PARENT_SYB, currentStore);
    }
  }

  return ALS.run(newStore, fn);
}

/**
 * To provide data to a descendants
 * @param enterWith Enter into injection context (Experimental)
 */
export function provide(key: ProvideKey, value: any, enterWith?: boolean) {
  let store = ALS.getStore();

  if (!store) {
    if (enterWith) {
      store = new Map();
      ALS.enterWith(store);
    } else {
      log.warn(
        `provide() can only be used inside async context.\n` +
          captureStackTrace(provide),
      );
      return;
    }
  }

  store.set(key, value);
}

export function inject<T = any>(key: ProvideKey): ProvideValue<T> {
  let currentStore = ALS.getStore();

  if (!currentStore) {
    log.warn(
      `inject() can only be used inside async context.\n` +
        captureStackTrace(inject),
    );
    return;
  }

  const handledStores = new WeakSet();

  let value;

  do {
    value = currentStore.get(key);
    handledStores.add(currentStore);
    currentStore = currentStore.get(PARENT_SYB);
  } while (
    currentStore &&
    value === undefined &&
    !handledStores.has(currentStore)
  );

  return value;
}

/**
 * Returns true if `inject()` can be used without warning about being called in the wrong place.
 */
export function hasInjectionContext() {
  return !!ALS.getStore();
}
