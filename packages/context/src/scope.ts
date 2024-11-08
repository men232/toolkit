import { type Awaitable, catchError, isPromise } from '@andrew_l/toolkit';
import type { AsyncLocalStorage } from 'node:async_hooks';

let idSec = 0;
let ALS: AsyncLocalStorage<Scope | null> | undefined;
let currentScope: Scope | null = null;

catchError(async () => {
  ALS = new (
    await import('node:async_hooks')
  ).AsyncLocalStorage<Scope | null>();
});

export class Scope {
  /**
   * @internal
   */
  id: number;

  /**
   * @internal
   */
  providers = new Map<any, any>();

  /**
   * @internal
   */
  parent: Scope | null = null;

  /**
   * @internal
   */
  cleanups: (() => void)[] = [];

  /**
   * @internal
   */
  private _activeRuns: number = 0;

  constructor(public detached = false) {
    this.id = ++idSec;

    if (!detached) {
      this.parent = getCurrentScope();
    }
  }

  run<T>(fn: () => T): T {
    this._activeRuns++;

    const onComplete = ([err, result]: [Error | undefined, any]): T => {
      this._activeRuns--;

      if (this._activeRuns === 0) {
        this.stop();
      }

      if (err) {
        throw err;
      }

      return result;
    };

    const r = runInScope(this, fn);

    if (isPromise<any>(r)) {
      return r.then(onComplete) as T;
    }

    return onComplete(r);
  }

  stop() {
    for (let i = 0, l = this.cleanups.length; i < l; i++) {
      this.cleanups[i]();
    }

    this.cleanups.length = 0;
  }

  get active(): boolean {
    return this._activeRuns > 0;
  }
}

/**
 * @param detached - Can be used to create a "detached" scope.
 */
export function createScope(detached?: boolean): Scope {
  return new Scope(detached);
}

/**
 * @group Main
 */
export function getCurrentScope(): Scope | null {
  if (ALS) {
    return ALS.getStore() ?? null;
  }

  return currentScope;
}

export function setCurrentScope(scope: Scope) {
  if (ALS) {
    ALS.enterWith(scope);
  } else {
    currentScope = scope;
  }
}

function runInScope<T>(
  scope: Scope,
  fn: () => T,
): Awaitable<[Error | undefined, any]> {
  if (ALS) {
    return catchError(() => ALS!.run(scope, fn));
  }

  const prevScope = getCurrentScope();

  const onComplete = ([err, result]: [Error | undefined, any]): [
    Error | undefined,
    any,
  ] => {
    if (prevScope) {
      setCurrentScope(prevScope);
    } else {
      unsetCurrentScope();
    }

    return [err, result];
  };

  const result = catchError(fn);

  if (isPromise<any>(result)) {
    return result.then(onComplete);
  }

  return onComplete(result);
}

const unsetCurrentScope = (): void => {
  if (ALS) {
    ALS.enterWith(null);
  } else {
    currentScope = null;
  }
};
