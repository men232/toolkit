import { has, isFunction } from '@andrew_l/toolkit';
import type { Transaction } from 'mongodb';
import type {
  ClientSessionLike,
  MongoClientLike,
} from './withMongoTransaction';

export function isTransactionAborted(transaction: Transaction): boolean {
  return (transaction as any)?.state === 'TRANSACTION_ABORTED';
}

// The driver's `Transaction.isCommitted` is deprecated and also true for TRANSACTION_ABORTED.
export function isTransactionCommitted(transaction: Transaction): boolean {
  const state = (transaction as any)?.state;
  return (
    state === 'TRANSACTION_COMMITTED' || state === 'TRANSACTION_COMMITTED_EMPTY'
  );
}

export function isTransactionCommittedEmpty(transaction: Transaction): boolean {
  return (transaction as any)?.state === 'TRANSACTION_COMMITTED_EMPTY';
}

export function isMongoClientLike(value: unknown): value is MongoClientLike {
  return has(value, ['startSession']) && isFunction(value.startSession);
}

export function isClientSessionLike(
  value: unknown,
): value is ClientSessionLike {
  return (
    has(value, ['withTransaction', 'endSession']) &&
    isFunction(value.withTransaction) &&
    isFunction(value.endSession)
  );
}
