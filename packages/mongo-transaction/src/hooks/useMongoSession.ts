import { createContext } from '@andrew_l/context';
import type { ClientSession } from 'mongodb';

export const [injectMongoSession, provideMongoSession] =
  createContext<ClientSession>('withMongoTransaction');

/**
 * Returns the current transaction session if executed within `withMongoTransaction()`
 *
 * @example
 * async function createAlert() {
 *   const session = useMongoSession();
 *
 *   await db.alerts.insertOne(
 *     { title: 'Order Created' },
 *     { session: session ?? undefined }
 *   );
 * }
 *
 * @group Hooks
 */
export function useMongoSession(): ClientSession | null {
  return injectMongoSession(null);
}
