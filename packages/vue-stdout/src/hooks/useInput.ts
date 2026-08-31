// Ported from ink's `src/hooks/use-input.ts`. React's `useEffectEvent` (the
// stable-identity-but-always-fresh-closure handler ink relies on there) has no
// Vue equivalent and needs none: `handleData` is created once per `useInput()`
// call in the caller's `setup()`, so reactive state it reads is read live off
// its own closure -- what `useEffectEvent` exists to provide, for free from
// ordinary closures over `.value` access.
import type { Fn } from '@andrew_l/toolkit';
import { type MaybeRefOrGetter, onScopeDispose, toValue, watch } from 'vue';
import { nonAlphanumericKeys, parseKeypress } from '../input/parseKeypress';
import { useStdinContext } from '../context';

/** Handy information about a key that was pressed. Matches ink's `Key` type. */
export interface Key {
  /** Up arrow key was pressed. */
  upArrow: boolean;
  /** Down arrow key was pressed. */
  downArrow: boolean;
  /** Left arrow key was pressed. */
  leftArrow: boolean;
  /** Right arrow key was pressed. */
  rightArrow: boolean;
  /** Page Down key was pressed. */
  pageDown: boolean;
  /** Page Up key was pressed. */
  pageUp: boolean;
  /** Home key was pressed. */
  home: boolean;
  /** End key was pressed. */
  end: boolean;
  /** Return (Enter) key was pressed. */
  return: boolean;
  /** Escape key was pressed. */
  escape: boolean;
  /** Ctrl key was pressed. */
  ctrl: boolean;
  /** Shift key was pressed. */
  shift: boolean;
  /** Tab key was pressed. */
  tab: boolean;
  /** Backspace key was pressed. */
  backspace: boolean;
  /** Delete key was pressed. */
  delete: boolean;
  /** Meta key was pressed. */
  meta: boolean;
  /**
   * Super key (Cmd on Mac, Win on Windows). Only available with the kitty
   * keyboard protocol, which nothing in this package can yet enable on a
   * terminal (`src/input/kitty.ts`), so this is always `false` today.
   * `parseKeypress` already decodes it, so wiring kitty support in later
   * needs no further parser change.
   */
  super: boolean;
  /** Hyper key. Kitty keyboard protocol only -- see `super`. */
  hyper: boolean;
  /** Caps Lock is active. Kitty keyboard protocol only -- see `super`. */
  capsLock: boolean;
  /** Num Lock is active. Kitty keyboard protocol only -- see `super`. */
  numLock: boolean;
  /** Event type for key events. Kitty keyboard protocol only -- see `super`. */
  eventType?: 'press' | 'repeat' | 'release';
}

export type InputHandler = (input: string, key: Key) => void;

export interface UseInputOptions {
  /**
   * Enable or disable capturing of user input. Useful when there are
   * multiple `useInput` hooks used at once, to avoid handling the same
   * input several times.
   *
   * Accepts a plain boolean, a `Ref<boolean>`, or a getter: toggling a
   * reactive value genuinely subscribes/unsubscribes live rather than
   * freezing at what it read on mount. This is what makes ink's documented
   * `useInput(handler, { isActive: isFocused })` idiom work here, where
   * `setup()` runs only once.
   *
   * @default true
   */
  isActive?: MaybeRefOrGetter<boolean>;
}

/**
 * Handles user input. A convenient alternative to reading `useStdin()` and
 * listening for input events directly. The handler is called for each
 * character entered; if the user pastes text longer than one character, the
 * handler is called once with the whole string as `input`.
 *
 * ```ts
 * useInput((input, key) => {
 *   if (input === 'q') {
 *     // exit
 *   }
 *
 *   if (key.leftArrow) {
 *     // left arrow key pressed
 *   }
 * });
 * ```
 *
 * Subscribes on mount (unless `options.isActive` is `false`), re-subscribes or
 * unsubscribes whenever a reactive `isActive` changes, and unsubscribes on
 * scope disposal.
 *
 * Returns that same `stop()`, for a caller that wants to unsubscribe before
 * its component goes away or that runs outside an effect scope where
 * `onScopeDispose` never fires. Ignoring it changes nothing.
 */
export function useInput(
  inputHandler: InputHandler,
  options: UseInputOptions = {},
): Fn {
  const { setRawMode, internal_exitOnCtrlC, internal_eventEmitter } = useStdinContext();

  const handleData = (data: string): void => {
    const keypress = parseKeypress(data);

    const key: Key = {
      upArrow: keypress.name === 'up',
      downArrow: keypress.name === 'down',
      leftArrow: keypress.name === 'left',
      rightArrow: keypress.name === 'right',
      pageDown: keypress.name === 'pagedown',
      pageUp: keypress.name === 'pageup',
      home: keypress.name === 'home',
      end: keypress.name === 'end',
      return: keypress.name === 'return',
      escape: keypress.name === 'escape',
      ctrl: keypress.ctrl,
      shift: keypress.shift,
      tab: keypress.name === 'tab',
      backspace: keypress.name === 'backspace',
      delete: keypress.name === 'delete',
      meta: keypress.meta,
      // Kitty keyboard protocol modifiers.
      super: keypress.super ?? false,
      hyper: keypress.hyper ?? false,
      capsLock: keypress.capsLock ?? false,
      numLock: keypress.numLock ?? false,
      eventType: keypress.eventType,
    };

    let input: string;
    if (keypress.isKittyProtocol) {
      // Use the text-as-codepoints field for printable keys (needed when
      // the reportAllKeysAsEscapeCodes flag is enabled), suppress
      // non-printable ones.
      if (keypress.isPrintable) {
        input = keypress.text ?? keypress.name;
      } else if (keypress.ctrl && keypress.name.length === 1) {
        // Ctrl+letter via codepoint 1-26 form: not printable text, but the
        // letter name must flow through so handlers (e.g. exitOnCtrlC
        // checking `input === 'c' && key.ctrl`) still work.
        input = keypress.name;
      } else {
        input = '';
      }
    } else if (keypress.ctrl) {
      // `keypress.name` is guaranteed non-undefined by parseKeypress, but
      // guard defensively -- a TypeError here would crash the entire app.
      input = keypress.name ?? '';
    } else {
      input = keypress.sequence;
    }

    if (!keypress.isKittyProtocol && nonAlphanumericKeys.includes(keypress.name)) {
      input = '';
    }

    // Strip the escape prefix from broken/incomplete sequences that
    // parseKeypress did not fully resolve (e.g. a flushed "\u001B[").
    if (input.startsWith('\u001B')) {
      input = input.slice(1);
    }

    if (input.length === 1 && /[A-Z]/.test(input)) {
      key.shift = true;
    }

    // If the app is supposed to exit on Ctrl+C, skip input listeners.
    if (input === 'c' && key.ctrl && internal_exitOnCtrlC) {
      return;
    }

    inputHandler(input, key);
  };

  let subscribed = false;

  const subscribe = (): void => {
    if (subscribed) return;
    // Unconditional, not gated on `isRawModeSupported` the way `useFocus` is
    // -- matching ink's `use-input.js`. Reading raw keystrokes is what calling
    // `useInput` asks for, so a `stdin` that cannot enter raw mode (piped
    // input) throws loudly here (`InputSource#subscribe`) rather than silently
    // delivering line-buffered input. `subscribed` is set only *after* this
    // succeeds, so a throw leaves the hook unsubscribed and a caller that
    // toggles `isActive` off then on retries cleanly instead of skipping it.
    setRawMode(true);
    subscribed = true;
    internal_eventEmitter.on('input', handleData);
  };

  const unsubscribe = (): void => {
    if (!subscribed) return;
    subscribed = false;
    internal_eventEmitter.off('input', handleData);
    setRawMode(false);
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
    // Synchronous, during setup rather than deferred to a tick, so
    // `subscribe()`'s `setRawMode(true)` takes effect before
    // `app.mount()` returns.
    { immediate: true },
  );

  const stop = (): void => {
    stopWatch();
    unsubscribe();
  };

  onScopeDispose(stop);

  return stop;
}
