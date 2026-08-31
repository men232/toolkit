import { Stream } from 'node:stream';
import process from 'node:process';
import { onExit } from 'signal-exit';
import isInCi from 'is-in-ci';
import type {
  App,
  Component,
  ComponentOptions,
  ComponentPublicInstance,
  DefineComponent,
  Directive,
  InjectionKey,
  Plugin,
} from '@vue/runtime-core';
import { Container } from './Container';
import { createVueApp } from './vueRenderer';
import { provideStreamContexts } from './context';
import { createDevRoot } from './dev/DevRoot';
import {
  isDevConnected,
  notifyDevExit,
  registerDevApp,
  unregisterDevApp,
  type DevAppLifecycle,
} from './dev/bridge';
import { FocusManager } from './focus';
import type { DOMDocument, DOMElement } from './tree/DOMTree';

export interface MountOptions {
  /** Output stream where the app will be rendered. @default process.stdout */
  stdout?: NodeJS.WriteStream;
  /** Input stream the app listens on. @default process.stdin */
  stdin?: NodeJS.ReadStream;
  /** Error stream. @default process.stderr */
  stderr?: NodeJS.WriteStream;
  /**
   * Write each committed update as its own separate output, nothing erased and
   * nothing diffed -- see `Container.debug` for the full contract. Useful when
   * output is redirected to a file: ANSI erase sequences in a log are noise, and
   * each render becomes its own appended record. Bypasses both `maxFps` (every
   * update is written -- matches ink) and `incrementalRendering` (a mode that
   * only appends has no previous on-screen frame to diff). Independent of
   * `interactive`: unlike plain non-interactive mode, which defers its one write
   * to unmount, `debug` writes every update whether or not `stdout` is a real
   * TTY. @default false
   */
  debug?: boolean;
  /**
   * Exit the app on Ctrl+C, the same way {@link StdoutApp.unmount} does. Only
   * takes effect once something (e.g. `useInput`) has put `stdin` into raw
   * mode -- with nothing subscribed, Ctrl+C is never read off `stdin` at
   * all, and the terminal's own SIGINT handling applies instead, matching
   * ink. @default true
   */
  exitOnCtrlC?: boolean;
  /**
   * Intercept `console.log`/`info`/`warn`/`error` for the lifetime of this
   * mount, so output from anywhere in the process lands above the rendered
   * frame instead of splitting it in two. Matches ink's default of `true`.
   * Deliberately **not** a wrapper around the `patch-console` package ink
   * delegates to: the interception has to cooperate with `frameHeight` and
   * `<Static>`, which that package knows nothing about (see
   * `src/patchConsole.ts`). A no-op in non-interactive mode, where nothing is
   * repainted during the app's life to protect. @default true
   */
  patchConsole?: boolean;
  /**
   * Caps how often a frame is laid out, painted and written to the terminal.
   * Matches ink: `0` disables the cap outright -- a distinct, deliberate
   * case, not "as fast as possible under some internal floor". Above `0` is
   * converted to a minimum interval between writes
   * (`Math.max(1, Math.ceil(1000 / maxFps))` ms, ink's formula), with the
   * *trailing* update always still landing once the burst settles -- a
   * throttle that dropped that last write would be indistinguishable from a
   * layout bug. Only meaningful in interactive mode, which is the only mode
   * that writes more than the one final frame.
   *
   * **A capped update is not computed, not merely not written**, which matters
   * twice. It is why raising this is not free: at `30` a 125 Hz source lays out
   * and paints ~107 frames where a downstream throttle would have computed ~400.
   * And it is why `useBoxMetrics`, `useContainerSize` and `measureElement`
   * refresh at *this* cadence -- they read computed layout, and the geometry
   * they no longer see belonged to frames nobody could see either. Their settled
   * value always arrives, because the trailing frame both lands and measures.
   * `<Static>` is exempt in both directions: its content is computed and flushed
   * as soon as it exists.
   *
   * @default 30
   */
  maxFps?: number;
  /**
   * Repaint only the lines that changed between two frames, instead of erasing
   * the previous frame whole and rewriting it. Fewer bytes for the same screen
   * -- which matters on a tall frame where a single line ticks (a progress bar,
   * a spinner, a counter), and over a slow link.
   *
   * `false` by default, matching ink: the full repaint is the simpler strategy.
   * `test/render-equivalence.test.ts` holds the two to producing the same
   * visible screen for the same sequence of frames, which is what makes this
   * safe to turn on. A no-op in non-interactive mode.
   *
   * **Out of scope: frames taller than the terminal.** Once a frame exceeds
   * `stdout.rows` its top has scrolled beyond the cursor's reach, so neither
   * strategy repaints it correctly and the two are not guaranteed to degrade the
   * same way. The full repaint has always had this limit (so does ink); this
   * option neither adds nor fixes it, and the equivalence suite deliberately
   * leaves the case uncovered rather than pin already-wrong behaviour. Keep the
   * frame within the terminal's height. @default false
   */
  incrementalRendering?: boolean;
  /**
   * Render into the terminal's alternate screen buffer instead of scrolling
   * into the primary one -- entered once at mount, and left again on every
   * exit path (unmount, `useApp().exit()`, Ctrl+C, an uncaught throw, or a
   * signal all reach `Container.destroy()`). Interactive-only, matching ink:
   * ignored in non-interactive mode, where there is no redrawn display to
   * switch away from. @default false
   */
  alternateScreen?: boolean;
  /**
   * Override automatic interactive-mode detection.
   *
   * By default, non-interactive when the environment is CI (via
   * [`is-in-ci`](https://github.com/sindresorhus/is-in-ci)) or `stdout` is
   * not a TTY -- CI takes precedence, so even a TTY `stdout` in CI is
   * non-interactive. In non-interactive mode, ANSI erase sequences, cursor
   * manipulation, and resize handling are all disabled, and only the final
   * frame is written, at unmount.
   *
   * Set to `true`/`false` to override the detection outright, in either
   * direction. @default TTY detection
   */
  interactive?: boolean;
  /** Called after each committed frame -- i.e. one that actually reached
   * the terminal (or, in non-interactive mode, became the frame `destroy()`
   * will write). Under a `maxFps` cap that is every render pass there is:
   * the cap skips the pass, so there is no uncommitted one to omit. */
  onRender?: (metrics: RenderMetrics) => void;
}

/**
 * Performance metrics for a committed render. Shape matches ink's own
 * `RenderMetrics` (`ink.tsx`) rather than inventing a new one.
 */
export interface RenderMetrics {
  /** Time spent laying out and painting this frame, in milliseconds. */
  renderTime: number;
}

type HostRoot = DOMElement | DOMDocument;
type HostApp = App<HostRoot>;

/**
 * Vue's `App` methods that return the polymorphic `this`. `Omit` is a mapped
 * type, and a mapped type resolves `this` to the type it was mapped from --
 * so keeping them would make `createApp(App).use(plugin)` return a plain
 * `App`, whose `mount` takes a DOM container and whose `waitUntilExit` does
 * not exist. Each one is redeclared verbatim below, `this` intact, so the
 * chain a Vue user writes without thinking still ends at a terminal mount.
 *
 * `filter` is deliberately *not* in this list. It is Vue 2 compat only,
 * optional, and nothing chains off it.
 */
type FluentAppMethod =
  | 'use'
  | 'mixin'
  | 'component'
  | 'directive'
  | 'provide';

/**
 * A Vue application whose mount target is a terminal.
 *
 * Everything except {@link StdoutApp.mount} and
 * {@link StdoutApp.waitUntilExit} is Vue's own application surface, produced by
 * Vue's own `createApp` (`src/vueRenderer.ts`) and untouched: `use`, `mixin`,
 * `component`, `directive`, `provide`, `runWithContext`, `unmount`,
 * `onUnmount`, `version`, and the full `config` object. A plugin, a global
 * component or an app-level `provide` behaves exactly as in a browser app,
 * because it *is* the same code.
 *
 * The two additions cover what a terminal has and a DOM does not: `mount` takes
 * streams rather than an element, and `waitUntilExit` gives the process a
 * promise to wait on, since a CLI's `main` must stay alive until the UI is done.
 */
export interface StdoutApp extends Omit<HostApp, 'mount' | FluentAppMethod> {
  use<Options extends unknown[]>(
    plugin: Plugin<Options>,
    ...options: Options
  ): this;
  use<Options>(plugin: Plugin<Options>, options: Options): this;
  mixin(mixin: ComponentOptions): this;
  component(name: string): Component | undefined;
  component<T extends Component | DefineComponent>(name: string, component: T): this;
  directive<
    HostElement = unknown,
    Value = unknown,
    Modifiers extends string = string,
    Arg extends string = string,
  >(
    name: string,
  ): Directive<HostElement, Value, Modifiers, Arg> | undefined;
  directive<
    HostElement = unknown,
    Value = unknown,
    Modifiers extends string = string,
    Arg extends string = string,
  >(
    name: string,
    directive: Directive<HostElement, Value, Modifiers, Arg>,
  ): this;
  provide<T, K = InjectionKey<T> | string | number>(
    key: K,
    value: K extends InjectionKey<infer V> ? V : T,
  ): this;
  /**
   * Mount the app and start rendering to the terminal.
   *
   * The argument is the mount *target*, the same role `app.mount('#app')`
   * plays in a browser app -- either the full {@link MountOptions}, or a bare
   * `WriteStream` as shorthand for `{ stdout: stream }`.
   *
   * Returns the root `ComponentPublicInstance`, exactly as Vue's own `mount`
   * does. (Not a `{@link}`: that type is Vue's, and this package does not
   * re-export it, so the reference would dangle in the shipped `.d.mts`.)
   *
   * One mount per app: mounting twice, or mounting an app that has already
   * exited, throws. Use a new `createApp()` for a new mount.
   */
  mount(options?: MountOptions | NodeJS.WriteStream): ComponentPublicInstance;
  /**
   * Resolves once the app exits -- via {@link StdoutApp.unmount},
   * `useApp().exit()`, Ctrl+C (with `exitOnCtrlC`), or a process signal.
   * Rejects instead if the app exited through `useApp().exit(error)`.
   *
   * Valid before `mount()`: the promise belongs to the app, not to a mount
   * (see the "exit is the app's, teardown is the mount's" note in this
   * file), so a caller may hold it from the moment the app is created.
   */
  waitUntilExit(): Promise<void>;
}

/**
 * One live app per output stream, process-wide.
 *
 * Two apps painting the same terminal interleave erase sequences and cursor
 * moves with each other's frames: neither one's screen is what it computed,
 * and the corruption looks like a layout bug in whichever app is read first.
 * Nothing downstream can detect it, so it is rejected here, at the one point
 * that knows both streams.
 *
 * Keyed by the stream itself and held weakly, so a closed or collected
 * stream drops its entry without a process-lifetime leak. Only a mount that
 * actually wired a `Container` takes an entry, and its teardown removes it --
 * a mount rejected by this guard wires nothing and must not evict the owner
 * it just collided with.
 *
 * This is a guard on *concurrency*, not on the stream: unmount frees the
 * stream for the next app, which is what makes a sequence of apps on
 * `process.stdout` (a wizard, a test file) work unchanged.
 */
const liveApps = new WeakMap<NodeJS.WriteStream, StdoutApp>();

/**
 * Matches ink's own `resolveInteractiveOption` (`ink.tsx`): CI takes
 * precedence over `stdout.isTTY` -- a TTY in CI is still non-interactive --
 * and an explicit `interactive` option short-circuits the detection
 * entirely, in either direction, before either signal is even consulted.
 */
function resolveInteractive(
  interactive: boolean | undefined,
  stdout: NodeJS.WriteStream,
): boolean {
  return interactive ?? (!isInCi && Boolean(stdout.isTTY));
}

function isWriteStream(
  value: MountOptions | NodeJS.WriteStream | undefined,
): value is NodeJS.WriteStream {
  if (value instanceof Stream) return true;

  // Test doubles (e.g. `createStdout()`) mimic a write stream's shape
  // without extending `Stream`; a `MountOptions` object never has `write`.
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as Partial<NodeJS.WriteStream>).write === 'function' &&
    !('stdout' in value)
  );
}

/** What one mount owns, and therefore what its teardown has to release. */
interface MountState {
  readonly container: Container;
  readonly stdout: NodeJS.WriteStream;
  /** Removes this mount's `signal-exit` callback. */
  readonly unregisterExit: () => void;
  /**
   * This mount's registration with the dev bridge, when a dev server is
   * driving; `undefined` in every ordinary run. See `src/dev/bridge.ts`.
   */
  readonly devApp: DevAppLifecycle | undefined;
}

/**
 * Create a terminal application from a root component.
 *
 * The returned object is Vue's -- `use`, `component`, `directive`, `provide`,
 * `mixin` and `config` all work as they do in a browser app -- with `mount`
 * pointed at a terminal instead of an element. See {@link StdoutApp}.
 *
 * @example
 * ```ts
 * const app = createApp(App);
 * app.use(somePlugin);
 * app.mount();
 * await app.waitUntilExit();
 * ```
 */
export function createApp(
  component: Component,
  rootProps?: Record<string, unknown> | null,
): StdoutApp {
  // Resolved once, here, rather than read at each use: a dev server connects
  // before the entry's body runs (its connector is injected at the top of the
  // module), so this is already settled and cannot flip mid-app. Everything
  // gated on it is inert in an ordinary run -- see `src/dev/bridge.ts`.
  const devConnected = isDevConnected();

  const baseApp = devConnected
    ? // The wrapper gives the user's root component a parent, which is what
      // Vue's `reload` branch needs; see `src/dev/DevRoot.ts`. `rootProps` go
      // to the wrapper's own render call rather than through Vue's root props,
      // so the user root receives exactly what it would have received.
      createVueApp(createDevRoot(component, rootProps ?? null), null)
    : createVueApp(component, rootProps ?? null);
  const vueMount = baseApp.mount.bind(baseApp);
  const vueUnmount = baseApp.unmount.bind(baseApp);

  // ---------------------------------------------------------------------
  // Exit is the app's; teardown is the mount's. Load-bearing, not stylistic:
  //
  //   * `exitPromise` is created here, once, and settles **at most once, for
  //     the app**. Nothing that merely ends a *mount* settles it.
  //   * `teardownMount()` releases everything one mount owns -- input, the
  //     alternate screen, the console patch, the resize listener, Yoga's wasm
  //     nodes -- and never touches the promise.
  //   * `exitApp()` is the only path that settles it: `teardownMount()` then
  //     `settleExit()`, in that order, the settle in a `finally` so a throwing
  //     disposer cannot strand a waiter on an already-restored terminal.
  //
  // Why the split must exist: a dev server with HMR tears a mount down and
  // builds a new one on every edit. If exit settled in teardown, the first edit
  // would resolve `waitUntilExit()` and the CLI's `await app.waitUntilExit()`
  // would return -- closing the whole Vite server.
  //
  // Creating the promise here is also what makes `waitUntilExit()` legal before
  // `mount()`: it is the app's lifetime, and the app exists from this line on.
  // ---------------------------------------------------------------------
  let resolveExit!: () => void;
  let rejectExit!: (error: Error) => void;
  const exitPromise = new Promise<void>((resolve, reject) => {
    resolveExit = resolve;
    rejectExit = reject;
  });
  // `exit(error)` may reject this before anyone has called `waitUntilExit()`.
  // Node flags an "unhandled rejection" only when nothing has ever subscribed
  // by the time it checks, so this synchronous no-op catch guarantees a
  // subscriber. Real subscribers are unaffected -- they still see the
  // rejection.
  exitPromise.catch(() => {});

  if (devConnected) {
    // A dev server runs this app *inside its own process*, so the server is
    // what holds the event loop open: a genuine exit has to tell it to close,
    // or the process hangs on a server nothing is using. A full reload never
    // reaches here -- it ends a mount without settling this promise, which is
    // exactly the distinction the split above exists to draw.
    //
    // `.finally` derives a *new* promise that re-rejects on an error exit, and
    // the `catch` on line above guards the original, not the derived one. The
    // second `catch` is therefore not redundant: without it an
    // `exit(new Error(...))` in a dev session surfaces as an unhandled
    // rejection.
    void exitPromise.finally(() => notifyDevExit()).catch(() => {});
  }

  let exitSettled = false;
  const settleExit = (error?: Error): void => {
    if (exitSettled) return;
    exitSettled = true;

    if (error) {
      rejectExit(error);
    } else {
      resolveExit();
    }
  };

  /** The live mount, or `undefined` before the first one and after teardown. */
  let mounted: MountState | undefined;
  let mountConsumed = false;

  // Every statement's position here is load-bearing.
  //
  // `unregisterExit` must be *scheduled*, not called synchronously.
  // `signal-exit`'s `Emitter.emit()` iterates its listener array by live
  // reference, and `unregisterExit` splices that same array. Called from inside
  // one app's own callback during a real exit, the splice shifts the next
  // listener into a slot the loop has already passed, skipping it: with apps A,
  // B, C, A's removal makes the iterator resume at C, and B's
  // `setRawMode(false)` never runs, leaving its terminal in raw mode.
  // Regression-tested in `test/exit-teardown-real-signal-exit.test.ts`, against
  // the real package because the hazard lives inside it.
  //
  // Detaching the renderer before `vueUnmount()` avoids queueing a frame nobody
  // wants: `nodeOps.remove()` emits `DOMChanged` per removal, and a full unmount
  // removes every node in one tick.
  //
  // `container.destroy()` goes in `finally` because every process-global restore
  // (raw mode, cursor, bracketed paste) lives there, and `vueUnmount()` can
  // throw: Vue's `EffectScope#stop()` runs `onScopeDispose` callbacks in a bare
  // loop with no try/catch, so one throwing disposer -- including a host
  // application's -- skips the rest. It must not be hoisted above `vueUnmount()`
  // instead: that frees the document's Yoga nodes before Vue has finished
  // walking the tree it renders into.
  const teardownMount = (): void => {
    const live = mounted;
    if (!live) return;

    // Cleared first so a re-entrant teardown (a disposer that calls
    // `unmount()`) finds nothing left to do rather than double-freeing
    // Yoga's nodes.
    mounted = undefined;
    liveApps.delete(live.stdout);
    // Before the release below, and identity-guarded inside: a dev session
    // that has already dropped this mount must not have a *later* one wiped by
    // this teardown finishing late.
    if (live.devApp) unregisterDevApp(live.devApp);

    queueMicrotask(live.unregisterExit);
    try {
      live.container.renderer.destroy();
      vueUnmount();
    } finally {
      live.container.destroy();
    }
  };

  // Latched *before* teardown runs, not inside `settleExit`, so a component
  // disposer that calls `exit()` during `vueUnmount()` returns immediately
  // instead of re-entering teardown. Whichever of `unmount()`, `exit()`,
  // Ctrl+C and the signal handler runs first wins; the rest are no-ops.
  let exitRequested = false;
  const exitApp = (error?: Error): void => {
    if (exitRequested) return;
    exitRequested = true;

    // Extends `teardownMount()`'s own restore guarantee to `waitUntilExit()`:
    // without this, a throwing disposer would skip the settle and leave it
    // hanging forever on top of an already-cleaned-up terminal. The original
    // error still propagates to the caller.
    try {
      teardownMount();
    } finally {
      settleExit(error);
    }
  };

  const mount = (
    options?: MountOptions | NodeJS.WriteStream,
  ): ComponentPublicInstance => {
    if (exitRequested) {
      throw new Error(
        'mount(): this app has already exited. Call createApp() again to ' +
          'mount a new one.',
      );
    }

    if (mountConsumed) {
      throw new Error(
        'mount(): this app is already mounted. Call createApp() again to ' +
          'mount a second one.',
      );
    }

    const resolved: MountOptions = isWriteStream(options)
      ? { stdout: options }
      : (options ?? {});

    const stdout = resolved.stdout ?? process.stdout;

    // Ahead of every allocation below: a rejected mount must leave the
    // colliding app's terminal, and this app, exactly as it found them.
    if (liveApps.has(stdout)) {
      throw new Error(
        'mount(): that output stream already has a live vue-stdout app. ' +
          'Two apps writing one terminal corrupt each other -- unmount the ' +
          'first, or mount this one on a different stdout.',
      );
    }

    mountConsumed = true;

    const container = new Container({
      alternateScreen: resolved.alternateScreen ?? false,
      debug: resolved.debug ?? false,
      exitOnCtrlC: resolved.exitOnCtrlC ?? true,
      incrementalRendering: resolved.incrementalRendering ?? false,
      interactive: resolveInteractive(resolved.interactive, stdout),
      maxFps: resolved.maxFps ?? 30,
      onRender: resolved.onRender,
      patchConsole: resolved.patchConsole ?? true,
      stdin: resolved.stdin ?? process.stdin,
      stdout,
      stderr: resolved.stderr ?? process.stderr,
    });

    // One registry per mount. It holds no process-global state and no
    // resources of its own -- every `useFocus` registration is removed by its
    // own disposer during `vueUnmount()` -- so it is scoped to the mount that
    // its `Container`'s Tab/Escape handling below drives. See `src/focus.ts`.
    const focusManager = new FocusManager();

    // Restores process-global state (raw mode, cursor, bracketed paste) on the
    // exit paths that skip `unmount()`/`exit()` entirely: `SIGINT`/`SIGTERM`,
    // and a render *after* the initial mount throwing inside Vue's scheduler --
    // unlike the synchronous `vueMount()` below, which this function's own
    // `catch` wraps, a scheduled update throws onto Vue's internal flush
    // promise, which nothing here can attach a `.catch()` to, so Node's default
    // `--unhandled-rejections=throw` crashes the process.
    //
    // `signal-exit` (ink's dependency for this too) runs `cb` synchronously just
    // before the process exits, through one refcounted listener shared by every
    // caller. That is why this does not register its own
    // `process.on('SIGINT', ...)`: concurrent apps and a host app's own handling
    // each get their callback, instead of only the first-registered one winning.
    // Neither this nor `signal-exit` calls `process.exit()` or overrides the
    // signal's default action.
    //
    // Never fires more than once (`exitApp()`'s `exitRequested` guard), and
    // `teardownMount()` removes it, so no stale listeners accumulate.
    const unregisterExit = onExit(() => {
      exitApp();
    });

    // The two halves of the dev contract, and their asymmetry is the design:
    // `replace()` ends the mount and leaves the app's exit promise pending, so
    // a reload cannot close the dev server; `close()` goes through the one
    // path that settles, and hands back the promise so the server can wait for
    // the terminal to be restored before the process leaves.
    const devApp: DevAppLifecycle | undefined = devConnected
      ? {
          replace: () => teardownMount(),
          close: () => {
            exitApp();
            return exitPromise;
          },
        }
      : undefined;

    const state: MountState = { container, stdout, unregisterExit, devApp };
    mounted = state;
    liveApps.set(stdout, app);
    if (devApp) registerDevApp(devApp);

    provideStreamContexts(baseApp, container, exitApp, focusManager);

    // Matches ink's `App.tsx`: checks the raw `'input'` string directly, ahead
    // of and independent from `useInput`'s per-keypress parsing, so this fires
    // even though `useInput` deliberately skips its own handler for these
    // keystrokes. Only ever invoked once something has put `stdin` into raw
    // mode, since `InputSource` emits `'input'` solely while subscribed -- so
    // with no consumer mounted, Ctrl+C never reaches here and the terminal's
    // own SIGINT handling applies instead, same as ink.
    //
    // The reactive reads below register no dependency: this handler only runs
    // from plain Node event-loop callbacks, never inside a Vue effect. That is
    // intended -- this is imperative navigation, not derived state.
    container.input.on('input', (input: string) => {
      if (input === '\u0003' && container.exitOnCtrlC) {
        exitApp();
        return;
      }

      // Gated on `isFocusEnabled` alone, unlike the Tab branch below, which
      // also requires `size`. That asymmetry is ink's (`App.tsx`), kept as a
      // direct port: `clearFocus()` already no-ops with nothing focused.
      if (input === '\u001B' && focusManager.isFocusEnabled.value) {
        focusManager.clearFocus();
      }

      if (!focusManager.isFocusEnabled.value || focusManager.size === 0) {
        return;
      }

      if (input === '\t') {
        focusManager.focusNext();
      } else if (input === '\u001B[Z') {
        focusManager.focusPrevious();
      }
    });

    try {
      return vueMount(container);
    } catch (error) {
      // A throwing mount would otherwise leak the Yoga nodes `container`
      // already allocated (WASM memory, not garbage collected) and its
      // `resize` listener. `unregisterExit()` too: this rethrows rather than
      // returning, so nothing else would ever reach `unmount()`/`exit()` to
      // remove the process-`exit` listener.
      //
      // Guarded on the mount still being *this* one: a component that called
      // `useApp().exit()` from `setup()` before throwing has already run
      // `teardownMount()`, and re-running it would double-free.
      if (mounted === state) {
        mounted = undefined;
        liveApps.delete(stdout);
        if (devApp) unregisterDevApp(devApp);
        unregisterExit();
        container.destroy();
      }

      throw error;
    }
  };

  // Vue built this object and owns everything on it; the two assignments
  // below replace `mount` (whose target is a terminal, not an element) and
  // add `waitUntilExit`, before the object escapes this function. The cast
  // is the handoff between those two facts: `StdoutApp` cannot *extend*
  // `App`, because its `mount` takes a different argument, so TypeScript has
  // no structural relation to check here.
  const app = baseApp as unknown as StdoutApp;

  app.mount = mount;
  app.waitUntilExit = () => exitPromise;
  // Vue's own method name, kept, and made to mean what it says: the whole
  // mount comes down -- input released, alternate screen left, console
  // unpatched, resize listener dropped, Yoga's wasm nodes freed -- and the
  // app's exit settles.
  app.unmount = () => {
    exitApp();
  };

  return app;
}
