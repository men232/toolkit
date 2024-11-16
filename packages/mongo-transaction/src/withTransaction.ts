import { AppError, catchError } from '@andrew_l/toolkit';

import { withContext } from '@andrew_l/context';
import { TransactionContext, effectsApply, effectsRollback } from './context';
import { provideTransactionContext } from './hooks/transactionContext';

/**
 * Wraps a function in a shared transaction context.
 *
 * Enables the use of hooks like `useTransactionEffect()`
 *
 * @example
 * const confirmOrder = withTransaction(async orderId => {
 *   // Register Alert
 *   await useTransactionEffect(async () => {
 *     const alertId = await alertService.create({
 *       title: 'New Order: ' + orderId,
 *     });
 *
 *     return () => alertService.removeById(alertId);
 *   });
 *
 *   // Update Statistics
 *   await useTransactionEffect(async () => {
 *     await statService.increment('orders_amount', 1);
 *
 *     return () => statService.decrement('orders_amount', 1);
 *   });
 *
 *   throw new Error('Cancel transaction.');
 * });
 *
 * @group Main
 */
export function withTransaction<T, K = any, Args extends Array<any> = any[]>(
  fn: (this: K, ...args: Args) => T,
): (this: K, ...args: Args) => Promise<Awaited<T>> {
  const context = new TransactionContext();

  const reset = () => {
    context.effectsCursor = 0;
    context.result = undefined;
    context.error = undefined;
  };

  const execute = withContext(async function (this: K, ...args: any[]) {
    reset();
    provideTransactionContext(context);

    const r = await catchError(async () => await fn.apply(this, args as Args));

    return r;
  });

  let processing = false;

  return async function (this: K, ...args: Args) {
    if (processing) {
      throw new AppError('Transaction function currently execution', 503);
    }

    processing = true;

    const [cbError, cbResult] = await execute.apply(this, args);

    if (cbError) {
      context.error = cbError;
      await effectsRollback(context);
    } else {
      const applyError = await effectsApply(context, 'post');

      if (applyError) {
        await effectsRollback(context);
        context.error = applyError;
      } else {
        context.result = cbResult;
      }
    }

    processing = false;

    const { result, error } = context;

    if (error) {
      return Promise.reject(error);
    }

    return result;
  } as any;
}
