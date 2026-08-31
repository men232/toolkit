import type { Plugin } from 'vite';

export const DEV_VMOD_ID = 'virtual:vue-stdout/dev';

/**
 * Rollup's convention: a `\0` prefix marks an id as virtual, so no other
 * plugin and no filesystem lookup tries to resolve it.
 */
export const RESOLVED_DEV_VMOD_ID = `\0${DEV_VMOD_ID}`;

export interface DevSessionRef {
  readonly sessionId: string;
}

/**
 * The connector, and every line of it is placed rather than written.
 *
 * It has to be a **Vite-transformed** module, because that is the only kind
 * with a live `import.meta.hot`: the renderer itself is externalized in dev, so
 * its own `import.meta.hot` is `undefined` and could never drive the bridge.
 * The dev plugin injects an import of this module at the *top* of the entry, so
 * ESM evaluation order guarantees it runs before the entry's `createApp()`.
 *
 * It reaches the bridge through `globalThis` rather than an import, because
 * there is no specifier it could import that would reach the *plugin's* copy of
 * `src/dev/bridge.ts` -- the plugin is resolved by Node, this module by Vite's
 * runner, and the two graphs never meet. The plugin installs `connect` on the
 * shared state before the entry is imported; see `src/dev/bridge.ts` for why
 * that shared state exists at all.
 *
 * The whole body is optional-guarded: a hot context that is somehow absent, or
 * a bridge the plugin failed to install, must leave the app running without HMR
 * rather than throwing inside the entry before anything is mounted.
 */
function snippet(sessionId: string): string {
  return (
    `const bridge = globalThis["__vue_stdout_dev_bridge__"];\n` +
    `if (import.meta.hot && bridge && typeof bridge.connect === "function") {\n` +
    `  bridge.connect(import.meta.hot, { sessionId: ${JSON.stringify(sessionId)} });\n` +
    `}\n`
  );
}

export function devVmodPlugin(session: DevSessionRef): Plugin {
  return {
    name: 'vue-stdout:dev-vmod',
    apply: 'serve',
    resolveId(id) {
      if (id === DEV_VMOD_ID) return RESOLVED_DEV_VMOD_ID;
      return undefined;
    },
    load(id) {
      if (id === RESOLVED_DEV_VMOD_ID) return snippet(session.sessionId);
      return undefined;
    },
  };
}
