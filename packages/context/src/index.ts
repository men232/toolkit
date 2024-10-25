import {
  assert,
  captureStackTrace,
  catchError,
  isFunction,
} from '@andrew_l/toolkit';
import type { AsyncLocalStorage } from 'node:async_hooks';

const PARENT_SYM = Symbol('ctx.parent');

export interface Instance {
  id: number;
  providers: Map<InjectionKey, any>;
}

export type ProvideKey = symbol | string | number | object;
export type ProvideValue<T = unknown> = T | undefined;
export type InjectionKey = symbol | string | number | object;

let idSec = 0;
let ALS: AsyncLocalStorage<Instance | null> | undefined;
let currentInstance: Instance | null = null;

catchError(async () => {
  ALS = new (
    await import('node:async_hooks')
  ).AsyncLocalStorage<Instance | null>();
});

/**
 * Create a function within injection context and returns its return value. The providers/injection is not accessible outside of the callback function.
 * @param isolated Do not inject parent providers into this context (Default: `false`)
 *
 * @example
 * const main = withContext(() => {
 *     provide('user', { id: 1, name: 'Andrew' });
 *     doCoolStaff();
 * });
 *
 * const doCoolStaff = () => {
 *     const user = inject('user');
 *     console.log(user); // { id: 1, name: 'Andrew' }
 * };
 *
 * main();
 *
 * @group Main
 */
export function withContext<T = any>(fn: () => T, isolated = false): () => T {
  const currentInstance = createInstance();
  const parentInstance = getCurrentInstance();

  if (!isolated) {
    if (parentInstance) {
      currentInstance.providers.set(PARENT_SYM, parentInstance);
    }
  }

  return () => runInContext(currentInstance, fn);
}

/**
 * Runs a function within injection context and returns its return value. The providers/injection is not accessible outside of the callback function.
 * @param isolated Do not inject parent providers into this context (Default: `false`)
 * @group Main
 */
export function runWithContext<T = any>(fn: () => T, isolated = false): T {
  return withContext(fn, isolated)();
}

function runInContext<T>(instance: Instance, fn: () => T) {
  if (ALS) {
    return ALS.run(instance, fn);
  }

  const prevInstance = getCurrentInstance();

  try {
    setCurrentInstance(instance);
    return fn();
  } catch (err) {
    throw err;
  } finally {
    if (prevInstance) {
      setCurrentInstance(prevInstance);
    } else {
      unsetCurrentInstance();
    }
  }
}

/**
 * Bind current context to provided function.
 *
 * Useful when you need to create callback with current context, for example `setTimeout` or `EventEmitter` event handler.
 *
 * @example
 * const main = withContext(() => {
 *   provide("user", { id: 1, name: "Andrew" });
 *
 *   setInterval(bindContext(() => {
 *     const user = inject("user");
 *     console.log(user); // { id: 1, name: 'Andrew' }
 *   }));
 * });
 *
 * main();
 *
 * @group Main
 */
export function bindContext<T>(fn: () => T): () => T {
  const currentInstance = getCurrentInstance();

  assert.ok(currentInstance, 'No current context execution.');

  if (ALS) {
    if ('bind' in ALS && isFunction(ALS.bind)) {
      return ALS.bind(fn);
    }

    return () => ALS!.run(currentInstance, fn);
  }

  return () => runInContext(currentInstance, fn);
}

/**
 * To provide data to a descendants
 * @param enterWith Enter into injection context (Experimental)
 * @group Main
 */
export function provide(key: ProvideKey, value: any, enterWith?: boolean) {
  let currentInstance = getCurrentInstance();

  if (!currentInstance) {
    if (enterWith) {
      currentInstance = createInstance();
      setCurrentInstance(currentInstance);
    } else {
      console.warn(
        `provide() can only be used inside async context.\n` +
          captureStackTrace(provide),
      );
      return;
    }
  }

  currentInstance.providers.set(key, value);
}

/**
 * Inject previously provided data
 * @group Main
 */
export function inject<T = any>(key: ProvideKey): ProvideValue<T> {
  const currentInstance = getCurrentInstance();

  if (!currentInstance) {
    console.warn(
      `inject() can only be used inside async context.\n` +
        captureStackTrace(inject),
    );
    return;
  }

  const handled = new WeakSet();

  let currentProvides = currentInstance.providers;
  let value;

  do {
    value = currentProvides.get(key);
    handled.add(currentProvides);
    currentProvides = currentProvides.get(PARENT_SYM);
  } while (
    currentProvides &&
    value === undefined &&
    !handled.has(currentProvides)
  );

  return value;
}

/**
 * Returns true if `inject()` can be used without warning about being called in the wrong place.
 * @group Main
 */
export function hasInjectionContext() {
  return !!getCurrentInstance();
}

/**
 * @group Main
 */
export function getCurrentInstance(): Instance | null {
  if (ALS) {
    return ALS.getStore() ?? null;
  }

  return currentInstance;
}

function setCurrentInstance(instance: Instance) {
  if (ALS) {
    ALS.enterWith(instance);
  } else {
    currentInstance = instance;
  }
}

function createInstance(): Instance {
  return {
    id: ++idSec,
    providers: new Map(),
  };
}

const unsetCurrentInstance = (): void => {
  if (ALS) {
    ALS.enterWith(null);
  } else {
    currentInstance = null;
  }
};
