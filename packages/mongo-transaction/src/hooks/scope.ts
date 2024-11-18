import { createContext } from '@andrew_l/context';
import type { TransactionScope } from '../scope';

export const [injectTransactionScope, provideTransactionScope] =
  createContext<TransactionScope>([
    'withTransaction',
    'withTransactionControlled',
    'withMongoTransaction',
  ]);
