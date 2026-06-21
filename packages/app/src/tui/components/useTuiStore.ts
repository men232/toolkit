import { createContext, useContext, useEffect, useState } from 'react';
import type { TuiStore } from '../store.ts';

export const TuiStoreContext = createContext<TuiStore | null>(null);

export function useTuiStore(): TuiStore {
  const store = useContext(TuiStoreContext);
  if (!store) throw new Error('TuiStoreContext is not provided');
  return store;
}

export function useStoreSnapshot(): number {
  const store = useTuiStore();
  const [version, setVersion] = useState(0);
  useEffect(() => {
    return store.subscribe(() => setVersion(v => v + 1));
  }, [store]);
  return version;
}
