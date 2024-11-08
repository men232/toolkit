import { captureStackTrace, isFunction } from '@andrew_l/toolkit';
import { Scope, getCurrentScope, setCurrentScope } from '../scope';

export type ProvideKey = symbol | string | number | object;
export type ProvideValue<T = unknown> = T | undefined;
export type InjectionKey = symbol | string | number | object;

/**
 * To provide data to a descendants
 * @param enterWith Enter into injection context (Experimental)
 * @group Main
 */
export function provide(key: ProvideKey, value: any, enterWith?: boolean) {
  let currentScope = getCurrentScope();

  if (!currentScope) {
    if (enterWith) {
      currentScope = new Scope();
      setCurrentScope(currentScope);
    } else {
      console.warn(
        `provide() is called when there is no active scope to be associated with.\n` +
          captureStackTrace(provide),
      );
      return;
    }
  }

  currentScope.providers.set(key, value);
}

/**
 * Inject previously provided data
 * @group Main
 */
export function inject<T = any>(
  key: ProvideKey,
  defaultValue?: T | (() => T),
): ProvideValue<T> {
  let currentScope = getCurrentScope();

  if (!currentScope) {
    console.warn(
      `inject() is called when there is no active scope to be associated with.\n` +
        captureStackTrace(inject),
    );
    return;
  }

  const handled = new WeakSet();

  let value;

  do {
    value = currentScope!.providers.get(key);
    handled.add(currentScope!);
    currentScope = currentScope!.parent;
  } while (currentScope && value === undefined && !handled.has(currentScope));

  if (value === undefined && defaultValue !== undefined) {
    value = isFunction(defaultValue) ? defaultValue() : defaultValue;
  }

  return value;
}

/**
 * Returns true if `inject()` can be used without warning about being called in the wrong place.
 * @group Main
 */
export function hasInjectionContext() {
  return !!getCurrentScope();
}
