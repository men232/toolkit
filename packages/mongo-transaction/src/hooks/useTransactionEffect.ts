import { isEqual } from '@andrew_l/toolkit';
import {
  type TransactionEffect,
  type TransactionScope,
  applyEffect,
  cleanupEffect,
} from '../scope';
import { injectTransactionScope } from './scope';

export type UseTransactionEffectOptions = Partial<
  Pick<TransactionEffect, 'name' | 'flush' | 'dependencies'>
>;

/**
 * Executes a callback and calls the cleanup function on error.
 *
 * The provided function is guaranteed to run only once, even if the MongoDB driver retries the original function.
 *
 * @param fn This function will be called once.
 *
 * @group Hooks
 */
export async function useTransactionEffect(
  setup: TransactionEffect['setup'],
  options: UseTransactionEffectOptions = {},
): Promise<void> {
  const scope = injectTransactionScope();

  const { cursor, byCursor } = scope.hooks.effects;

  const effectConfig: Partial<TransactionEffect> = byCursor[cursor] ?? {};

  const flush = options?.flush || 'pre';
  const name = options?.name || `Effect #${cursor + 1}`;
  const dependencies = options.dependencies ?? [];
  const prevDependencies = effectConfig.dependencies;

  byCursor[cursor] = {
    ...effectConfig,
    dependencies,
    flush,
    name,
    setup,
  };

  if (dependencies && prevDependencies) {
    if (!isEqual(dependencies, prevDependencies)) {
      scope.log.debug(
        'Effect name = %s, flush = %s, caused by dependencies',
        name,
        flush,
        {
          prevDependencies,
          newDependencies: dependencies,
        },
      );

      await scheduleEffect(scope, cursor);
    }
  } else {
    scope.log.debug(
      'Effect name = %s, flush = %s, caused by missing dependencies',
      name,
      flush,
    );

    await scheduleEffect(scope, cursor);
  }

  scope.hooks.effects.cursor++;
}

async function scheduleEffect(scope: TransactionScope, cursor: number) {
  const { byCursor } = scope.hooks.effects;
  const effect = byCursor[cursor]!;

  const cleanupErr = await cleanupEffect(scope, effect, 'schedule pre');

  if (cleanupErr) {
    return Promise.reject(cleanupErr);
  }

  if (effect.flush === 'pre') {
    const err = await applyEffect(scope, effect, 'schedule pre');

    if (err) {
      return Promise.reject(err);
    }
  }
}
