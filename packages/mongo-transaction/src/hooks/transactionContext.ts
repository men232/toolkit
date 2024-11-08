import { createContext } from '@andrew_l/context';
import type { TransactionContext } from '../context';

export const [injectTransactionContext, provideTransactionContext] =
  createContext<TransactionContext>([
    'withTransaction',
    'withMongoTransaction',
  ]);
