import { type InjectionKey, inject, provide } from 'vue';
import type { TuiStore } from '../store.ts';

const TUI_STORE_KEY: InjectionKey<TuiStore> = Symbol('TuiStore');

/**
 * Share the store with the whole panel tree. Called by `TuiRoot`, which owns
 * the store it was handed and passes it to composables directly -- `inject()`
 * reads the *parent's* provides, so the providing component never sees its own.
 */
export function provideTuiStore(store: TuiStore): void {
  provide(TUI_STORE_KEY, store);
}

/** The shared store, for any component below `TuiRoot`. */
export function useTuiStore(): TuiStore {
  const store = inject(TUI_STORE_KEY);
  if (!store) throw new Error('TuiStore was not provided');
  return store;
}
