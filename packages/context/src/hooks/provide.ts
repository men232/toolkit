import { captureStackTrace, isFunction } from '@andrew_l/toolkit';
import { log } from '../constants';
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
  var currentScope = getCurrentScope();

  if (!currentScope) {
    if (enterWith) {
      currentScope = new Scope();
      setCurrentScope(currentScope);
    } else {
      log.warn(
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
  var currentScope = getCurrentScope();

  if (!currentScope) {
    log.warn(
      `inject() is called when there is no active scope to be associated with.\n` +
        captureStackTrace(inject),
    );
    return;
  }

  var value;
  var parent: Scope | null = null;

  do {
    value = currentScope!.providers.get(key);
    parent = currentScope!.parent;
    currentScope = parent && parent.id < currentScope!.id ? parent : null;
  } while (currentScope && value === undefined);

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
