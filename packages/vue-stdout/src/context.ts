// Ported from ink's app-level React contexts. Vue's equivalent is
// `provide`/`inject`, scoped to the `App` instance rather than a component
// subtree. ink fills all its contexts once at the application root; likewise
// `provideStreamContexts` is called once from `src/createApp.ts`, inside
// `mount()` -- it needs the `Container`, which only exists from that point on
// -- and before Vue's own mount walks the tree.
//
// Deliberately one entry point rather than a call per context: everything here
// sits on the same `Container`, so new contexts extend this function instead
// of adding a second wiring point in `createApp.ts`.
import type { App, InjectionKey, ShallowRef } from 'vue';
import { inject } from 'vue';
import type { Container, WindowSize } from './Container';
import type { CursorPosition } from './cursorHelpers';
import type { FocusManager } from './focus';

/**
 * Matches ink's `StdinContext` (`PublicProps` plus the two `internal_*` fields
 * `useInput` needs). `internal_eventEmitter` is `Container['input']` directly,
 * dispatching a plain `'input'` string per keystroke or paste fallback (see
 * `src/input/InputSource.ts`).
 */
export interface StdinContextValue {
  /** The stdin stream passed to `mount()`, or `process.stdin` by default. */
  readonly stdin: NodeJS.ReadStream;
  /**
   * ink exposes this instead of `stdin.setRawMode` directly so raw mode can
   * be reference-counted across multiple `useInput` hooks. Maps to
   * `Container['input']`'s own ref-counted `subscribe()`/`unsubscribe()`.
   */
  readonly setRawMode: (value: boolean) => void;
  /** Whether the current `stdin` can actually be put into raw mode. */
  readonly isRawModeSupported: boolean;
  /**
   * Enable or disable bracketed paste mode on the terminal (`\x1b[?2004h`/
   * `\x1b[?2004l`) so pasted text arrives as a single `'paste'` event instead
   * of being misread as individual keystrokes. Reference-counted across
   * concurrent `usePaste()` hooks, as `setRawMode` is across `useInput()`.
   */
  readonly setBracketedPasteMode: (value: boolean) => void;
  /** @internal Whether `mount()` was given `exitOnCtrlC: true` (the default). */
  readonly internal_exitOnCtrlC: boolean;
  /** @internal Source of `'input'` (and `'paste'`) events; see `InputSource`. */
  readonly internal_eventEmitter: Container['input'];
}

/** Matches ink's `StdoutContext`, plus `clear` (see `src/hooks/useStdout.ts`). */
export interface StdoutContextValue {
  /** The stdout stream passed to `mount()`, or `process.stdout` by default. */
  readonly stdout: NodeJS.WriteStream;
  /** Write a string straight to `stdout`. */
  readonly write: (data: string) => void;
  /** Erase the terminal, so the next frame paints onto a blank screen. */
  readonly clear: () => void;
  /**
   * The terminal size the layout was last computed at, as reactive data.
   * Owned by `Container` (see `Container.windowSize`) so every consumer
   * shares its one `'resize'` subscription and reports the same size the
   * layout used; `useWindowSize` is the public read path.
   *
   * Read-only at the type level only -- the runtime value is `Container`'s
   * own writable ref, and `Container`'s `syncWindowSize` is its only writer.
   *
   * @internal
   */
  readonly windowSize: Readonly<ShallowRef<WindowSize>>;
}

/** Matches ink's `StderrContext`. */
export interface StderrContextValue {
  /** The stderr stream passed to `mount()`, or `process.stderr` by default. */
  readonly stderr: NodeJS.WriteStream;
  /** Write a string straight to `stderr`. */
  readonly write: (data: string) => void;
}

/**
 * Matches ink's `AppContext`, pared down to the one method `useApp()` needs
 * (see `src/hooks/useApp.ts`).
 */
export interface AppContextValue {
  /**
   * Exit (unmount) the app the same way `app.unmount()` does. With no
   * argument, `waitUntilExit()` resolves. Passed an `Error`, `waitUntilExit()`
   * rejects with it instead. See `src/createApp.ts`.
   */
  readonly exit: (error?: Error) => void;
}

export const StdinContextKey: InjectionKey<StdinContextValue> =
  Symbol('vue-stdout:StdinContext');
export const StdoutContextKey: InjectionKey<StdoutContextValue> =
  Symbol('vue-stdout:StdoutContext');
export const StderrContextKey: InjectionKey<StderrContextValue> =
  Symbol('vue-stdout:StderrContext');
export const AppContextKey: InjectionKey<AppContextValue> =
  Symbol('vue-stdout:AppContext');
/**
 * The injected value is the `FocusManager` instance itself (`src/focus.ts`),
 * not a pared-down interface: `useFocus`/`useFocusManager` need both its
 * methods and its reactive state, so there is no narrower shape worth carving
 * out.
 */
export const FocusContextKey: InjectionKey<FocusManager> =
  Symbol('vue-stdout:FocusContext');

/**
 * Matches ink's `CursorContext` -- the one method `useCursor()`
 * (`src/hooks/useCursor.ts`) needs to place (or hide) the real terminal
 * cursor, e.g. for IME composing-character support.
 */
export interface CursorContextValue {
  /** Set the cursor position relative to the rendered output. Pass `undefined` to hide it. */
  readonly setCursorPosition: (position: CursorPosition | undefined) => void;
}

export const CursorContextKey: InjectionKey<CursorContextValue> =
  Symbol('vue-stdout:CursorContext');

/**
 * Fills every stream context off one `Container`, plus `AppContext`'s `exit`.
 * Called once per mount from `src/createApp.ts`.
 *
 * `exit` is a parameter rather than read off `Container` because it settles
 * the *app's* exit promise, which outlives any one mount and which `Container`
 * therefore does not own -- see the lifetime note in `src/createApp.ts`.
 */
export function provideStreamContexts(
  app: App,
  container: Container,
  exit: (error?: Error) => void,
  focusManager: FocusManager,
): void {
  const stdinValue: StdinContextValue = {
    stdin: container.stdin,
    setRawMode: (value: boolean) => {
      if (value) {
        container.input.subscribe();
      } else {
        container.input.unsubscribe();
      }
    },
    get isRawModeSupported() {
      return container.input.isRawModeSupported;
    },
    setBracketedPasteMode: (value: boolean) => {
      container.setBracketedPasteMode(value);
    },
    internal_exitOnCtrlC: container.exitOnCtrlC,
    internal_eventEmitter: container.input,
  };

  app.provide(StdinContextKey, stdinValue);

  app.provide(StdoutContextKey, {
    stdout: container.stdout,
    write: (data: string) => {
      container.stdout.write(data);
    },
    clear: () => {
      container.clear();
    },
    // The `Container`'s own ref, not a copy, so every consumer reads the
    // size the layout is actually at.
    windowSize: container.windowSize,
  });

  app.provide(StderrContextKey, {
    stderr: container.stderr,
    write: (data: string) => {
      container.stderr.write(data);
    },
  });

  app.provide(AppContextKey, { exit });

  app.provide(FocusContextKey, focusManager);

  app.provide(CursorContextKey, {
    setCursorPosition: (position: CursorPosition | undefined) => {
      container.setCursorPosition(position);
    },
  });
}

function injectOrThrow<T>(key: InjectionKey<T>, hookName: string): T {
  const value = inject(key);

  if (!value) {
    throw new Error(
      `${hookName}() was called outside of a vue-stdout app. ` +
        'It must be called from a component mounted via createApp().mount() ' +
        '(src/createApp.ts).',
    );
  }

  return value;
}

/** @internal Consumed by `useInput`; not re-exported from `src/index.ts`. */
export function useStdinContext(): StdinContextValue {
  return injectOrThrow(StdinContextKey, 'useStdin');
}

/** @internal */
export function useStdoutContext(): StdoutContextValue {
  return injectOrThrow(StdoutContextKey, 'useStdout');
}

/** @internal */
export function useStderrContext(): StderrContextValue {
  return injectOrThrow(StderrContextKey, 'useStderr');
}

/** @internal Consumed by `useApp`; not re-exported from `src/index.ts`. */
export function useAppContext(): AppContextValue {
  return injectOrThrow(AppContextKey, 'useApp');
}

/**
 * @internal Consumed by `useFocus`/`useFocusManager`; not re-exported from
 * `src/index.ts`. `hookName` is a parameter here, unlike in the helpers above,
 * so the outside-the-tree error names whichever of the two hooks was called.
 */
export function useFocusContext(hookName: string): FocusManager {
  return injectOrThrow(FocusContextKey, hookName);
}

/** @internal Consumed by `useCursor`; not re-exported from `src/index.ts`. */
export function useCursorContext(): CursorContextValue {
  return injectOrThrow(CursorContextKey, 'useCursor');
}
