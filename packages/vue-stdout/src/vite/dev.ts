import { isRunnableDevEnvironment, type Plugin } from 'vite';
import {
  DEV_EXIT_EVENT,
  disconnectDevtools,
  installDevConnector,
} from '../dev/bridge.ts';
import { bridgeHmrEventsToRunner } from './bridge-hmr.ts';
import { DEV_VMOD_ID, type DevSessionRef } from './dev-vmod.ts';
import {
  moduleIdMatchesConfiguredEntry,
  normalizeDevEntry,
  resolveConfiguredEntry,
} from './entry-match.ts';
import { wrapServerClose } from './wrap-server-close.ts';

export interface DevPluginOptions {
  readonly session: DevSessionRef;
  /**
   * The app entry, relative to the Vite root or absolute. Required: this
   * plugin's whole job is to run one process, and guessing which module that
   * is turns a typo into a dev server that starts and paints nothing.
   */
  readonly entry: string;
}

export function devPlugin({ session, entry }: DevPluginOptions): Plugin {
  const runnerEntry = normalizeDevEntry(entry);
  let resolvedEntry = runnerEntry;
  let preserveSymlinks = false;
  let closing = false;

  function tearDownSession(): Promise<void> {
    if (closing) return Promise.resolve();
    closing = true;
    return disconnectDevtools(session.sessionId);
  }

  return {
    name: 'vue-stdout:dev',
    apply: 'serve',

    config() {
      return {
        // The app owns the screen; Vite must not wipe it, and its info-level
        // chatter must not land in the middle of a frame. Errors stay on:
        // this phase ships no error overlay, so Vite's own reporting is the
        // only thing a developer has when a compile fails.
        clearScreen: false,
        logLevel: 'error',
        server: {
          // Hygiene, not correctness -- and the distinction matters, because
          // `server.hmr: false` *is* fatal and the two are easy to conflate.
          // With `ws: false` Vite swaps in a stub whose `send` is a no-op, so
          // nothing about HMR changes; what it buys is not standing up a
          // WebSocket server, an upgrade handler and origin checks in a
          // process whose only client is in-process. `hmr` must stay on:
          // `unplugin-vue` gates its entire HMR emission on
          // `server.hmr !== false`, and turning it off would also stop the
          // module runner ever receiving `full-reload`.
          ws: false,
        },
      };
    },

    configResolved(config) {
      preserveSymlinks = config.resolve.preserveSymlinks;
      resolvedEntry = resolveConfiguredEntry(config.root, runnerEntry);
    },

    transform(code, id) {
      // Injected at the *top* of the entry so ESM evaluation order puts the
      // connector before `createApp()`. Matched exactly against the resolved
      // entry -- a suffix match would inject into any file whose path merely
      // ends the same way, and there is no error to observe when it hits the
      // wrong one.
      if (moduleIdMatchesConfiguredEntry(id, resolvedEntry, preserveSymlinks)) {
        return { code: `import ${JSON.stringify(DEV_VMOD_ID)};\n${code}`, map: null };
      }
      return undefined;
    },

    configureServer(server) {
      // The app owns `process.stdin`, in raw mode. Vite's CLI shortcuts attach
      // their own readline `'line'` listener to it, so a submitted `q` would
      // run `server.close()` out from under a running TUI, and `r` would
      // restart it. The terminal app owns the keys here, not the CLI.
      server.bindCLIShortcuts = () => {};

      // Without this, every SFC edit resets component state. See the file.
      bridgeHmrEventsToRunner(server, { preserveSymlinks });

      // Makes *this* copy of the bridge module the one the injected connector
      // calls. Runs before the entry is ever imported, which is the ordering
      // the connector depends on.
      installDevConnector();

      // Cross-wire the two lifetimes, both directions. The app runs inside
      // this process, so neither can end alone: the server's close must end
      // the app (and wait for the terminal to be restored), and the app's
      // genuine exit must close the server that is holding the event loop
      // open. A full reload deliberately does neither -- it ends a mount
      // without settling the app's exit -- so it never reaches this event.
      wrapServerClose(server, tearDownSession);
      server.environments.ssr?.hot.on(DEV_EXIT_EVENT, () => {
        void server.close();
      });

      // The post hook, and returning it un-run is the point rather than a
      // style choice. Vite awaits the `configureServer` *body*
      // (`postHooks.push(await hook.call(...))`) but calls what it returns
      // with `postHooks.forEach(fn => fn())`, discarding the result. So work
      // started here cannot block `_createServer` -- which matters because a
      // config edit restarts by building the new server *before* closing the
      // old one, and anything awaited earlier would deadlock that.
      return () => {
        const env = server.environments.ssr;

        if (!isRunnableDevEnvironment(env)) {
          console.error(
            '[vue-stdout] the "ssr" environment is not runnable; the app cannot start',
          );
          return;
        }

        env.runner.import(runnerEntry).catch((error: unknown) => {
          if (closing) return;
          console.error(`[vue-stdout] failed to launch ${runnerEntry}`);
          console.error(error);
        });
      };
    },
  };
}
