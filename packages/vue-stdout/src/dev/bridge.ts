/**
 * The seam between a running app and a Vite dev server, and nothing else.
 *
 * **Internal.** Not in `package.json`'s `exports`, not re-exported from
 * `src/index.ts`. The only two callers are `src/createApp.ts` (which registers
 * the live mount) and `src/vite/dev.ts` (which drives it), and neither is a
 * consumer surface. Everything here is inert until a dev server calls
 * {@link connectDevtools}: in production `isDevConnected()` is one boolean read
 * that is always `false`.
 *
 * ## Why the state is on `globalThis`
 *
 * The dev server runs the app *inside its own Node process*, in Vite's runnable
 * `ssr` environment. That puts **two copies of this module** in one process: the
 * plugin's, resolved by Node from `vite.config.ts`, and the app's, resolved and
 * transformed by Vite inside the module runner. They are different instances
 * with different closures, and they must agree on who owns the terminal. A
 * module-level `let` would silently fork: the plugin would hold a hot context
 * the app never sees, `disconnectDevtools` on server close would find no app to
 * end, and every reload would leak a mount. So the *state* lives at one
 * `globalThis` key that both copies operate on; only the shape below is
 * duplicated.
 *
 * The same split is why {@link DevBridgeState.connect} exists. The connector
 * snippet the plugin injects into the entry is a Vite-transformed module -- the
 * only kind with a live `import.meta.hot`, since the app's own modules are
 * externalized -- and no specifier it could import this file through would reach
 * the *plugin's* copy. It reads the function off the shared state instead, which
 * the plugin installs with {@link installDevConnector} before the entry is
 * imported.
 */

/**
 * The part of Vite's `import.meta.hot` this bridge uses.
 *
 * Declared structurally rather than derived from `ImportMeta['hot']`: that
 * type comes from Vite's ambient client augmentation, which this package's
 * `tsconfig.json` does not pull in and a consumer's may not either.
 */
export interface DevHotContext {
  on(event: string, cb: (payload: unknown) => void): void;
  send(event: string, data?: unknown): void;
}

/**
 * What a mounted app offers a dev server. The asymmetry between the two is the
 * whole design, and it mirrors the exit/teardown split in `src/createApp.ts`:
 *
 *  - {@link DevAppLifecycle.replace} ends a *mount*. It must not settle the
 *    app's exit promise, because a full reload is not an exit -- settling it
 *    would return from the CLI's `await app.waitUntilExit()` and close the dev
 *    server on the first edit.
 *  - {@link DevAppLifecycle.close} ends the *app*. It settles, and the caller
 *    awaits it, because the session is genuinely over and the terminal has to
 *    be restored before the process leaves.
 */
export interface DevAppLifecycle {
  /** Release this mount so a re-imported entry can build a fresh one. */
  replace(): void;
  /** End this app because the dev session that owns it is closing. */
  close(): void | Promise<void>;
}

export interface ConnectDevtoolsOptions {
  /**
   * Identity of the dev session that owns this connection. A full reload of
   * the same server re-runs the connector with the *same* id and a *new* hot
   * context; a different id while a session is live is a conflict.
   */
  sessionId?: string;
}

interface DevBridgeState {
  /** The hot context currently driving this bridge, or `undefined`. */
  bridgedHot: DevHotContext | undefined;
  activeSessionId: string | undefined;
  /**
   * Every mount that opted into the dev session. A set, not a single slot:
   * this package deliberately supports two concurrent mounts on two streams
   * (see `alternateScreenRefCounts` in `src/Container.ts`), and a single slot
   * would silently strand whichever mounted first -- never replaced on a
   * reload, never closed on shutdown, still holding a terminal.
   */
  currentDevApps: Set<DevAppLifecycle>;
  devConnected: boolean;
  /** Installed by the plugin's copy; called by the injected connector. */
  connect:
    | ((hot: DevHotContext, options?: ConnectDevtoolsOptions) => void)
    | undefined;
}

/**
 * Also spelled, as a string literal, in the connector snippet
 * (`src/vite/dev-vmod.ts`). Changing it means changing both.
 */
const BRIDGE_KEY = '__vue_stdout_dev_bridge__';

function bridge(): DevBridgeState {
  const global = globalThis as typeof globalThis & {
    [BRIDGE_KEY]?: DevBridgeState;
  };

  const state = (global[BRIDGE_KEY] ??= {
    bridgedHot: undefined,
    activeSessionId: undefined,
    currentDevApps: new Set(),
    devConnected: false,
    connect: undefined,
  });

  // A second copy of this module -- a different version of the package pulled
  // into the same dev process -- may find state created by an older one.
  // Upgrade it in place rather than failing on a field that copy never wrote.
  state.currentDevApps ??= new Set();

  return state;
}

/**
 * Whether a dev server has connected. `createApp()` reads this once, to decide
 * whether to register itself and whether to wrap the root component; nothing
 * else in `src/` may branch on it.
 */
export function isDevConnected(): boolean {
  return bridge().devConnected;
}

/** The live session's id, if any. Introspection for the plugin and tests. */
export function getDevSessionId(): string | undefined {
  return bridge().activeSessionId;
}

export function registerDevApp(app: DevAppLifecycle): void {
  bridge().currentDevApps.add(app);
}

/**
 * Identity-guarded by `Set.delete`, and that matters: during a reload the old
 * mount tears itself down *after* the handler has already dropped it, and a
 * later mount must not be wiped by a stale teardown.
 */
export function unregisterDevApp(app: DevAppLifecycle): void {
  bridge().currentDevApps.delete(app);
}

/**
 * Signal the dev plugin that the app has *genuinely* exited -- `unmount()`,
 * `useApp().exit()`, Ctrl+C, a signal -- so it can close the dev server holding
 * the event loop open. A full reload never reaches here: it releases the mount
 * without settling the app's exit promise, which is the point of that split.
 * A no-op when nothing is bridged, so production costs one property read.
 */
export function notifyDevExit(): void {
  bridge().bridgedHot?.send(DEV_EXIT_EVENT);
}

/** The custom hot event {@link notifyDevExit} sends and the plugin listens for. */
export const DEV_EXIT_EVENT = 'vue-stdout:exit';

/**
 * Make this copy of the module the one whose {@link connectDevtools} the
 * injected connector will call. Called by the plugin in `configureServer`,
 * which always runs before the entry is imported.
 */
export function installDevConnector(): void {
  bridge().connect = connectDevtools;
}

export class DevSessionConflictError extends Error {
  override readonly name = 'DevSessionConflictError';

  constructor() {
    super(
      'Another vue-stdout dev session is already active in this process; ' +
        'close it before starting a new one.',
    );
  }
}

/**
 * Hand a live hot context to the bridge and mark dev as connected.
 *
 * Called only from the connector module the plugin injects at the top of the
 * entry, so it runs before `createApp()` in the same module's body -- which is
 * what lets `createApp()` read `isDevConnected()` and get `true`.
 */
export function connectDevtools(
  hot: DevHotContext,
  options?: ConnectDevtoolsOptions,
): void {
  const sessionId = options?.sessionId;
  const state = bridge();

  if (state.activeSessionId !== undefined && sessionId !== state.activeSessionId) {
    throw new DevSessionConflictError();
  }

  if (sessionId !== undefined) state.activeSessionId = sessionId;
  state.devConnected = true;
  armHotListeners(hot);
}

/**
 * End the session owned by `sessionId` (or the only one, when omitted).
 * Identity-guarded and idempotent.
 *
 * The order below is load-bearing: the hot channel is dropped **before** the
 * apps are closed. Closing settles each app's exit promise, whose `finally`
 * calls {@link notifyDevExit} -- and with the channel still bridged that would
 * send `vue-stdout:exit` back to the plugin, re-entering the very
 * `server.close()` that started this.
 */
export function disconnectDevtools(sessionId?: string): Promise<void> {
  const state = bridge();

  if (
    sessionId !== undefined &&
    state.activeSessionId !== undefined &&
    state.activeSessionId !== sessionId
  ) {
    return Promise.resolve();
  }

  const apps = [...state.currentDevApps];
  state.currentDevApps.clear();
  state.bridgedHot = undefined;
  state.devConnected = false;
  state.activeSessionId = undefined;

  return Promise.all(apps.map(app => app.close())).then(() => undefined);
}

/**
 * Subscribe to the hot context's lifecycle events.
 *
 * Re-armed per *context*, not once per process. A full reload re-executes the
 * connector and hands over a **new** hot whose constructor already dropped the
 * previous one's listeners, so the new one must be armed. But Vite appends
 * listeners with no de-duplication, so re-arming the *same* hot would
 * double-fire every event -- hence the identity check on the way in, and the one
 * inside each handler on the way out (Vite retires a context without offering
 * any unsubscribe, so a queued event from a retired one must not mutate a later
 * session).
 */
function armHotListeners(hot: DevHotContext): void {
  const state = bridge();
  if (hot === state.bridgedHot) return;
  state.bridgedHot = hot;

  const on = (event: string, handler: () => void): void => {
    hot.on(event, () => {
      if (bridge().bridgedHot !== hot) return;

      // Containment, and not defensive habit. Vite's module runner notifies
      // these with `await Promise.allSettled(cbs.map(cb => cb(data)))`:
      // `allSettled` catches *rejections*, but a listener that throws
      // synchronously throws inside `.map`, before any promise exists. It
      // escapes the notifier, escapes the async HMR handler, and kills the Node
      // process -- taking the dev server and the terminal restoration with it.
      // Everything this bridge does on the way out (`Container.destroy()`,
      // `app.unmount()`, raw-mode restoration) is synchronous, so this is the
      // exact shape that is fatal. Measured against vite 8.2.2; see
      // `.agents/docs/gotchas.md#a-synchronous-throw-in-a-vite-hot-listener-kills-the-process`.
      try {
        handler();
      } catch (error) {
        console.error(`[vue-stdout] dev handler for ${event} failed`);
        console.error(error);
      }
    });
  };

  // A full reload is a genuine release-and-reacquire. Vite's runner awaits
  // these listeners, *then* clears its evaluated modules, *then* re-imports
  // the entry -- so releasing here is what lets the fresh `createApp().mount()`
  // find a terminal nobody holds. The re-import is the runner's own doing
  // (`vite/dist/node/module-runner.js`, the `full-reload` case); nothing here
  // imports anything, and adding a re-import would run the entry twice.
  on('vite:beforeFullReload', () => {
    const live = bridge();
    const apps = [...live.currentDevApps];
    live.currentDevApps.clear();

    // Contained one at a time, not as a batch: with two mounts, the first
    // throwing must not leave the second holding a terminal the re-imported
    // entry is about to paint over.
    for (const app of apps) {
      try {
        app.replace();
      } catch (error) {
        console.error('[vue-stdout] failed to release a mount for reload');
        console.error(error);
      }
    }
  });
}
