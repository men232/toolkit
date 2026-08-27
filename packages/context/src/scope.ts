import { isPromise, noop } from '@andrew_l/toolkit';
import type { AsyncLocalStorage } from 'node:async_hooks';
import { log } from './constants';

var idSec = 0;
var ALS: AsyncLocalStorage<Scope | null> | undefined;
var currentScope: Scope | null = null;

import('node:async_hooks')
  .then(r => {
    ALS = new r.AsyncLocalStorage<Scope | null>();
  })
  .catch(noop);

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
   * Lazily created on the first onScopeDispose() — most scopes register no
   * cleanup, so they skip the array allocation entirely.
   * @internal
   */
  cleanups: (() => void)[] | null = null;

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

    var result: any;

    if (ALS) {
      try {
        result = ALS.run(this, fn);
      } catch (err) {
        this._finishRun();
        throw err;
      }

      return this._settleRun(result);
    }

    var prevScope = getCurrentScope();
    currentScope = this;

    try {
      result = fn();
    } catch (err) {
      currentScope = prevScope;
      this._finishRun();
      throw err;
    }

    if (isPromise(result)) {
      return result.then(
        value => {
          currentScope = prevScope;
          this._finishRun();
          return value;
        },
        err => {
          currentScope = prevScope;
          this._finishRun();
          throw err;
        },
      ) as T;
    }

    currentScope = prevScope;
    this._finishRun();
    return result;
  }

  private _settleRun<T>(result: any): T {
    if (isPromise(result)) {
      return result.then(
        value => {
          this._finishRun();
          return value;
        },
        err => {
          this._finishRun();
          throw err;
        },
      ) as T;
    }

    this._finishRun();
    return result;
  }

  private _finishRun(): void {
    this._activeRuns--;

    if (this._activeRuns === 0) {
      this.stop();
    }
  }

  stop() {
    var cleanups = this.cleanups;

    if (!cleanups) return;

    this.cleanups = null;

    for (var i = 0, l = cleanups.length; i < l; i++) {
      try {
        cleanups[i]();
      } catch (err) {
        log.error('cleanup execution error', err);
      }
    }
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
