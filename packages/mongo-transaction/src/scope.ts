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
  async _run(self?: any, ...args: Args): Promise<void> {
    assert.ok(!this._active, 'Cannot run while transaction active.');

    this.reset();
    this._active = true;

    const [cbError, cbResult] = await withContext(() => {
      provideTransactionScope(this);
      return catchError(this.fn.bind(self, ...(args as any[])));
    })();

    if (cbError) {
      this.error = cbError;
    } else {
      const applyError = await effectsApply(this, 'post');

      if (applyError) {
        this.error = applyError;
      }

      this.result = cbResult;
    }

    this._active = false;
  }

  async commit(): Promise<void> {
    assert.ok(!this._active, 'Cannot commit while transaction active.');
    assert.ok(!this.error, this.error);

    await asyncForEach(
      this.hooks.committed.byCursor,
      h => catchError(h.callback) as any,
      { concurrency: 4 },
    );

    this.reset();
    this.clean();
  }

  async rollback(): Promise<void> {
    assert.ok(!this._active, 'Cannot rollback while transaction active.');

    const error = await effectsCleanup(this);

    if (error) {
      return Promise.reject(error);
    }

    await asyncForEach(
      this.hooks.rollbacks.byCursor,
      h => catchError(h.callback) as any,
      { concurrency: 4 },
    );

    this.reset();
    this.clean();
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

export async function effectsApply(
  scope: TransactionScope,
  reason: string = 'no reason',
): Promise<Error | undefined> {
  let error: Error | undefined;

  const onComplete = (err: Error | undefined) => void (error = err || error);

  await asyncForEach(
    scope.hooks.effects.byCursor,
    effect => applyEffect(scope, effect, reason).then(onComplete),
    {
      concurrency: 4,
    },
  );

  return error;
}

export async function effectsCleanup(
  scope: TransactionScope,
  reason: string = 'no reason',
): Promise<Error | undefined> {
  let error: Error | undefined;

  const onComplete = (err: Error | undefined) => void (error = err || error);

  await asyncForEach(
    scope.hooks.effects.byCursor,
    effect => cleanupEffect(scope, effect, reason).then(onComplete),
    {
      concurrency: 4,
    },
  );

  return error;
}

export async function applyEffect(
  scope: TransactionScope,
  effect: TransactionEffect,
  reason: string = 'no reason',
): Promise<Error | undefined> {
  if (effect.cleanup) return;

  scope.log.debug(
    'Effect name = %s, flush = %s, apply by %s',
    effect.name,
    effect.flush,
    reason,
  );

  const [err, effectResult] = await catchError(effect.setup);

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

  return;
}

export async function cleanupEffect(
  scope: TransactionScope,
  effect: TransactionEffect,
  reason: string = 'no reason',
): Promise<Error | undefined> {
  if (!effect.cleanup) return;

  scope.log.debug(
    'Effect name = %s, flush = %s, cleanup by %s',
    effect.name,
    effect.flush,
    reason,
  );

  const [err] = await catchError(effect.cleanup);

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
}
