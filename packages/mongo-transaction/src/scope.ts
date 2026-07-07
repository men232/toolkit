import { withContext } from '@andrew_l/context';
import {
  type Awaitable,
  assert,
  asyncForEach,
  catchError,
  env,
  isFunction,
  logger,
  noop,
} from '@andrew_l/toolkit';
import { provideTransactionScope } from './hooks/scope';

export interface TransactionEffect {
  /**
   * Specifies when the transaction effect should run:
   *
   * `pre` -  execute immediately
   *
   *  `post` - execute before transaction commit
   *
   * @default: "pre"
   */
  flush: 'pre' | 'post';

  /**
   * Setup effect function. You can return a cleanup callback to be used as a rollback.
   */
  setup: EffectCallback;

  /**
   * Cleanup function.
   */
  cleanup?: EffectCleanup;

  /**
   * Useful for debugging execution logs.
   */
  name?: string;

  dependencies?: readonly any[];
}

export type EffectCallback = () => Awaitable<EffectCleanup | void>;

export type EffectCleanup = () => Awaitable<void>;

export interface TransactionOnCommitted {
  callback: OnCommittedCallback;
  dependencies?: readonly any[];
}

export type OnCommittedCallback = () => Awaitable<void>;

export interface TransactionOnRollback {
  callback: OnRollbackCallback;
  dependencies?: readonly any[];
}

export type OnRollbackCallback = () => Awaitable<void>;

interface TransactionScopeHooks {
  effects: {
    cursor: number;
    byCursor: TransactionEffect[];
  };
  committed: {
    cursor: number;
    byCursor: TransactionOnCommitted[];
  };
  rollbacks: {
    cursor: number;
    byCursor: TransactionOnRollback[];
  };
}

export class TransactionScope<T = any, Args extends any[] = any[]> {
  /**
   * @internal
   */
  log = logger('TransactionScope');

  /**
   * @internal
   * Indicates currently ran scope
   */
  _active: boolean = false;

  /**
   * Last run error
   */
  error: Error | undefined;

  /**
   * Last run result
   */
  result: T | undefined;

  run: (this: any, ...args: Args) => Promise<void>;

  /**
   * @internal
   */
  hooks: TransactionScopeHooks = {
    committed: { byCursor: [], cursor: 0 },
    effects: { byCursor: [], cursor: 0 },
    rollbacks: { byCursor: [], cursor: 0 },
  };

  constructor(private fn: (...args: Args) => T) {
    const scope = this;

    this.run = function (...args) {
      const self = this === scope ? undefined : this;
      return scope._run(self, ...args);
    };
  }

  get active(): boolean {
    return this._active;
  }

  /**
   * @internal
   */
  _run(self?: any, ...args: Args): Promise<void> {
    if (this._active) {
      return Promise.reject(
        new Error('Cannot commit while transaction active.'),
      );
    }

    this.reset();
    this._active = true;

    return Promise.resolve()
      .then(() =>
        withContext(() => {
          provideTransactionScope(this);
          return catchError(() => this.fn.call(self, ...args) as Awaited<T>);
        })(),
      )
      .then(({ 0: cbError, 1: cbResult }) => {
        if (cbError) {
          this.error = cbError;
        } else {
          return effectsApply(this, 'post').then(applyError => {
            if (applyError) {
              this.error = applyError;
            }

            this.result = cbResult;
          });
        }
      })
      .finally(() => {
        this._active = false;
      });
  }

  commit(): Promise<void> {
    if (this._active) {
      return Promise.reject(
        new Error('Cannot commit while transaction active.'),
      );
    }
    if (this.error) {
      return Promise.reject(this.error);
    }

    return asyncForEach(
      this.hooks.committed.byCursor,
      h => catchError(h.callback) as any,
      { concurrency: 4 },
    ).then(() => {
      this.reset();
      this.clean();
    });
  }

  rollback(): Promise<void> {
    if (this._active) {
      return Promise.reject(
        new Error('Cannot rollback while transaction active.'),
      );
    }

    return effectsCleanup(this).then(error => {
      if (error) {
        return Promise.reject(error);
      }

      return asyncForEach(
        this.hooks.rollbacks.byCursor,
        h => catchError(h.callback) as any,
        { concurrency: 4 },
      ).then(() => {
        this.reset();
        this.clean();
      });
    });
  }

  reset() {
    assert.ok(!this._active, 'Cannot reset while transaction active.');

    this.hooks.effects.cursor = 0;
    this.hooks.committed.cursor = 0;
    this.hooks.rollbacks.cursor = 0;
    this.result = undefined;
    this.error = undefined;
  }

  clean() {
    assert.ok(!this._active, 'Cannot clean while transaction active.');
    this.hooks.effects = { byCursor: [], cursor: 0 };
    this.hooks.committed = { byCursor: [], cursor: 0 };
    this.hooks.rollbacks = { byCursor: [], cursor: 0 };
  }
}

export function createTransactionScope<T = any, Args extends any[] = any[]>(
  fn: (...args: Args) => T,
): TransactionScope<Awaited<T>, Args> {
  return new TransactionScope<any>(fn);
}

export function effectsApply(
  scope: TransactionScope,
  reason: string = 'no reason',
): Promise<Error | undefined> {
  let error: Error | undefined;

  const onComplete = (err: Error | undefined) => void (error = err || error);

  return asyncForEach(
    scope.hooks.effects.byCursor,
    effect => applyEffect(scope, effect, reason).then(onComplete),
    {
      concurrency: 4,
    },
  ).then(() => error);
}

export function effectsCleanup(
  scope: TransactionScope,
  reason: string = 'no reason',
): Promise<Error | undefined> {
  let error: Error | undefined;

  const onComplete = (err: Error | undefined) => void (error = err || error);

  return asyncForEach(
    scope.hooks.effects.byCursor,
    effect => cleanupEffect(scope, effect, reason).then(onComplete),
    {
      concurrency: 4,
    },
  ).then(() => error);
}

export function applyEffect(
  scope: TransactionScope,
  effect: TransactionEffect,
  reason: string = 'no reason',
): Promise<Error | undefined> {
  if (effect.cleanup) return Promise.resolve(undefined);

  scope.log.debug(
    'Effect name = %s, flush = %s, apply by %s',
    effect.name,
    effect.flush,
    reason,
  );

  return Promise.resolve()
    .then(() => catchError(effect.setup))
    .then(({ 0: err, 1: effectResult }) => {
      if (err) {
        !env.isTest &&
          scope.log.error(
            'Effect name = %s, flush = %s apply error',
            effect.name,
            effect.flush,
            err,
          );
        return err;
      }

      effect.cleanup = isFunction(effectResult) ? effectResult : noop;
    });
}

export function cleanupEffect(
  scope: TransactionScope,
  effect: TransactionEffect,
  reason: string = 'no reason',
): Promise<Error | undefined> {
  if (!effect.cleanup) return Promise.resolve(undefined);

  scope.log.debug(
    'Effect name = %s, flush = %s, cleanup by %s',
    effect.name,
    effect.flush,
    reason,
  );

  return Promise.resolve()
    .then(() => catchError(effect.cleanup!))
    .then(({ 0: err }) => {
      if (err) {
        !env.isTest &&
          scope.log.error(
            'Effect name = %s, flush = %s, cleanup error',
            effect.name,
            effect.flush,
            err,
          );
        return err;
      }

      effect.cleanup = undefined;
    });
}
