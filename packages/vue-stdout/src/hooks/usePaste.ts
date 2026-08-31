// Ported from ink's `src/hooks/use-paste.ts`. Sits on the bracketed-paste
// detection `src/input/inputParser.ts` already does: this hook never re-parses
// `ESC[200~...ESC[201~`, it subscribes to the `'paste'` event `InputSource`
// emits and toggles bracketed paste mode around that subscription so the
// terminal sends those sequences at all.
//
// ink wraps its handler in `useEffectEvent`; as `useInput.ts`'s header
// explains, Vue needs no equivalent -- `handler` is the caller's own function,
// read live off its closure on every `'paste'` event.
import type { Fn } from '@andrew_l/toolkit';
import { type MaybeRefOrGetter, onScopeDispose, toValue, watch } from 'vue';
import { useStdinContext } from '../context';

export type PasteHandler = (text: string) => void;

export interface UsePasteOptions {
  /**
   * Enable or disable the paste handler. Useful when multiple components
   * use `usePaste` and only one should be active at a time.
   *
   * Accepts a plain boolean, a `Ref<boolean>`, or a getter -- matching
   * `useInput`'s own `isActive` (`src/hooks/useInput.ts`), so toggling a
   * reactive value passed here genuinely subscribes/unsubscribes live.
   *
   * @default true
   */
  isActive?: MaybeRefOrGetter<boolean>;
}

/**
 * Calls `handler` whenever the user pastes text in the terminal. Bracketed
 * paste mode is automatically enabled while the hook is active, so pasted
 * text arrives as a single string rather than being misinterpreted as
 * individual key presses.
 *
 * `usePaste` and `useInput` can be used together in the same component: they
 * are separate event channels, and paste content is never forwarded to
 * `useInput` handlers while `usePaste` is active. With no `usePaste` listener
 * mounted, `InputSource` falls back to dispatching pasted text as ordinary
 * input, matching ink.
 *
 * Must be called from a component mounted via `createApp().mount()`.
 *
 * Returns the `stop()` it also registers with `onScopeDispose`, same as
 * `useInput`; ignoring it changes nothing.
 */
export function usePaste(
  handler: PasteHandler,
  options: UsePasteOptions = {},
): Fn {
  const { setRawMode, setBracketedPasteMode, internal_eventEmitter } = useStdinContext();

  let subscribed = false;

  const subscribe = (): void => {
    if (subscribed) return;
    // Unconditional, and `subscribed` set only after it succeeds, for the same
    // reasons as `useInput`'s own `setRawMode(true)` -- see its comment.
    // Matches ink's `use-paste.js`.
    setRawMode(true);
    subscribed = true;
    setBracketedPasteMode(true);
    internal_eventEmitter.on('paste', handler);
  };

  const unsubscribe = (): void => {
    if (!subscribed) return;
    subscribed = false;
    internal_eventEmitter.off('paste', handler);
    setRawMode(false);
    setBracketedPasteMode(false);
  };

  const stopWatch = watch(
    () => toValue(options.isActive) !== false,
    active => {
      if (active) {
        subscribe();
      } else {
        unsubscribe();
      }
    },
    // Synchronous during setup, as in `useInput`: raw mode and bracketed
    // paste mode must take effect before `app.mount()` returns.
    { immediate: true },
  );

  const stop = (): void => {
    stopWatch();
    unsubscribe();
  };

  onScopeDispose(stop);

  return stop;
}
