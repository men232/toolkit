import { log } from '../constants';
import { type TransactionEffect, applyEffect } from '../context';
import { injectTransactionContext } from './transactionContext';

export type UseTransactionEffectOptions = Partial<
  Omit<TransactionEffect, 'callback' | 'rollback'>
>;

/**
 * Executes a callback and calls the rollback function on error.
 *
 * The provided function is guaranteed to run only once, even if the MongoDB driver retries the original function.
 *
 * @param fn This function will be called once.
 *
 * @group Hooks
 */
export async function useTransactionEffect(
  fn: TransactionEffect['callback'],
  options?: UseTransactionEffectOptions,
): Promise<void> {
  const context = injectTransactionContext();

  const effect: TransactionEffect = {
    callback: fn,
    flush: options?.flush || 'pre',
    name: options?.name || `Effect #${context.effects.length + 1}`,
  };

  if (context.effectsCursor < context.effects.length) {
    log.debug(
      '[effect:skip] name = %s, flush = %s, reason = cursor',
      effect.name,
      effect.flush,
    );

    context.effectsCursor++;
    return;
  }

  context.effectsCursor++;

  if (effect.flush === 'pre') {
    const err = await applyEffect(context, effect, 'pre');

    if (err) {
      return Promise.reject(err);
    }
  }

  context.effects.push(effect);
}
