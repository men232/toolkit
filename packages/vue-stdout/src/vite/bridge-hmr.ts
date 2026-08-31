/**
 * Adapted from @vue-tui/vite -- `packages/vite/src/bridge-hmr.ts`, its
 * `runnerPayload` helper and the `ws.send` wrapper at the end of
 * `bridgeHmrEventsToRunner`.
 *
 * MIT License. Copyright (c) 2026 Yunfei He.
 * Full notice: `packages/vue-stdout/THIRD-PARTY-NOTICES.md`.
 *
 * Changes from the original: only the `file-changed` forwarding is taken. The
 * error-pairing half -- `ErrorIdentity`, `sameDiagnostic`, the `hot.send`
 * wrapper and the timestamp bookkeeping -- is left behind, because this phase
 * ships no error overlay and therefore has no duplicate diagnostic to collapse.
 */
import path from 'node:path';
import type { HotPayload, ViteDevServer } from 'vite';
import { resolvePhysicalPath } from './physical-path.ts';

type SendArgs = [HotPayload] | [string, unknown?];

/**
 * `unplugin-vue` compares this `file` against the compiled module's *physical*
 * filename to decide rerender versus reload. Vite may compile through a real
 * path while its watcher reports an equivalent symlink -- `/var` against
 * `/private/var` on macOS is the everyday case -- so the two disagree and every
 * edit falls back to reload.
 *
 * Normalised on the **runner's copy only**. The original payload is left alone:
 * anything else reading the browser channel is entitled to the path the watcher
 * actually reported.
 */
function runnerPayload(
  payload: HotPayload,
  preserveSymlinks: boolean,
): HotPayload {
  if (payload.type !== 'custom' || payload.event !== 'file-changed') return payload;
  if (preserveSymlinks) return payload;

  const data = payload.data;
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return payload;
  }

  const file = (data as { file?: unknown }).file;
  if (typeof file !== 'string' || !path.isAbsolute(file)) return payload;

  const physicalFile = resolvePhysicalPath(file);
  if (physicalFile === file) return payload;

  return { ...payload, data: { ...data, file: physicalFile } };
}

/**
 * Forward Vite's custom hot payloads from the browser channel onto the `ssr`
 * environment's in-process one.
 *
 * **This is the difference between HMR and a restart, and it is the whole
 * reason this file exists.** `unplugin-vue` broadcasts its rerender-versus-
 * reload decision as a `file-changed` custom event through `server.ws` -- the
 * channel this dev server has no client on, because the app runs in the module
 * runner. Without the forwarding the runner never sees it, the compiled SFC's
 * `__VUE_HMR_RUNTIME__.CHANGED_FILE` stays stale, its `_rerender_only` export
 * is `false`, and **every** SFC edit takes the state-*resetting* `reload`
 * branch. The frame still updates, which is exactly what makes the absence hard
 * to notice: the counter quietly goes back to zero.
 *
 * Measured both ways against vite 8.2.2 / unplugin-vue 7.2.0; the capture and
 * its numbers are in `.agents/docs/gotchas.md`, "Without the `file-changed`
 * forwarding, HMR is a fast full reload". Roughly fifteen lines buy
 * state-preserving template edits.
 */
export function bridgeHmrEventsToRunner(
  server: ViteDevServer,
  { preserveSymlinks = false }: { preserveSymlinks?: boolean } = {},
): void {
  const ssr = server.environments.ssr;
  if (!ssr) return;

  const hot = ssr.hot as { send: (...args: SendArgs) => void };
  const ws = server.ws as { send: (...args: SendArgs) => void };
  const originalWsSend = ws.send.bind(ws);

  ws.send = (...args: SendArgs): void => {
    const payload: HotPayload =
      typeof args[0] === 'string'
        ? { type: 'custom', event: args[0], data: args[1] }
        : args[0];

    // Custom payloads only. Vite's `error` payloads travel this channel too,
    // and vue-tui forwards them so its overlay can show them; with no overlay
    // here they would only add a second report of what Vite has already
    // printed. Forwarding them belongs with the error phase, not this one.
    if (payload.type === 'custom') {
      hot.send(runnerPayload(payload, preserveSymlinks));
    }

    originalWsSend(...args);
  };
}
