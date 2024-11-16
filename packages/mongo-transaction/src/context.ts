import {
  type Awaitable,
  asyncForEach,
  catchError,
  env,
  isFunction,
} from '@andrew_l/toolkit';
import { log } from './constants';

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
   * Transaction callback effect. You can return a function to be used as a rollback.
   */
  callback: TransactionCallback;

  /**
   * Rollback function.
   */
  rollback?: TransactionRollback;

  /**
   * Useful for debugging execution logs.
   */
  name?: string;
}

type TransactionCallback = () => Awaitable<TransactionRollback | void>;

type TransactionRollback = () => Awaitable<void>;

export class TransactionContext<T = any> {
  public effects: TransactionEffect[] = [];
  public effectsCursor = 0;

  public applied = new WeakSet<TransactionEffect>();

  public result: T | undefined = undefined;
  public error: Error | undefined = undefined;

  constructor() {}

  clean() {
    this.effects = [];
    this.effectsCursor = 0;
    this.applied = new WeakSet();
    this.result = undefined;
    this.error = undefined;
  }
}

export async function effectsApply(
  context: TransactionContext,
  reason: string,
): Promise<Error | undefined> {
  let error: Error | undefined;

  const onComplete = (err: Error | undefined) => void (error = err || error);

  await asyncForEach(
    context.effects,
    effect => applyEffect(context, effect, reason).then(onComplete),
    {
      concurrency: 4,
    },
  );

  return error;
}

export async function effectsRollback(
  context: TransactionContext,
): Promise<Error | undefined> {
  let error: Error | undefined;

  const onComplete = (err: Error | undefined) => void (error = err || error);

  await asyncForEach(
    context.effects,
    effect => rollbackEffect(context, effect).then(onComplete),
    {
      concurrency: 4,
    },
  );

  return error;
}

export async function applyEffect(
  context: TransactionContext,
  effect: TransactionEffect,
  reason: string,
): Promise<Error | undefined> {
  if (context.applied.has(effect)) return;

  log.debug(
    '[effect:execute] name = %s, flush = %s, reason = %s',
    effect.name,
    effect.flush,
    reason,
  );

  const [err, effectResult] = await catchError(effect.callback);

  if (err) {
    !env.isTest && log.error('[effect:error] name = %s, flush = %s', err);
    return err;
  }

  context.applied.add(effect);

  if (isFunction(effectResult)) {
    effect.rollback = effectResult;
  }

  return;
}

export async function rollbackEffect(
  context: TransactionContext,
  effect: TransactionEffect,
) {
  if (!context.applied.has(effect)) return;
  if (!effect.rollback) return;

  log.debug(
    '[effect:rollback] name = %s, flush = %s, reason = error',
    effect.name,
    effect.flush,
  );

  const [err] = await catchError(effect.rollback);

  if (err) {
    !env.isTest &&
      log.error(
        '[effect:rollback] name = %s, flush = %s, reason = error',
        effect.name,
        effect.flush,
        err,
      );
    return err;
  }

  effect.rollback = undefined;
  context.applied.delete(effect);
}
