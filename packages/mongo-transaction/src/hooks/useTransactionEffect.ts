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
 * Executes a transactional effect with cleanup on error or rollback.
 *
 * Ensures the `callback` function is executed only once per transaction, even during retries.
 * On errors or dependency changes, the cleanup logic is invoked before re-execution to maintain consistency.
 *
 * @param setup A function defining the transactional effect. It is guaranteed to run once per transaction
 *              and may be re-executed after cleanup if dependencies change.
 *
 * @example
 * const confirmOrder = withMongoTransaction({
 *   connection: () => mongoose.connection.getClient(),
 *   async fn(session) {
 *     // Register an alert as a transactional effect
 *     await useTransactionEffect(async () => {
 *       const alertId = await alertService.create({
 *         title: `Order Confirmed: ${orderId}`,
 *       });
 *
 *       // Define cleanup logic to remove the alert on rollback
 *       return () => alertService.removeById(alertId);
 *     });
 *
 *     // Simulate order processing (e.g., database updates)
 *     await db
 *       .collection('orders')
 *       .updateOne({ orderId }, { $set: { status: 'confirmed' } }, { session });
 *
 *     // Simulate an error to test rollback
 *     throw new Error('Simulated transaction failure');
 *   },
 * });
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
