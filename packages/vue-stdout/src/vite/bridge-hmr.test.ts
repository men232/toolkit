import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { HotPayload, ViteDevServer } from 'vite';
import { describe, expect, it } from 'vitest';
import { bridgeHmrEventsToRunner } from './bridge-hmr.ts';

type SendArgs = [HotPayload] | [string, unknown?];

/**
 * The two channels this module bridges, and nothing else. `bridgeHmrEventsToRunner`
 * only ever reads `server.ws.send` and `server.environments.ssr.hot.send`.
 */
function createServer(): {
  server: ViteDevServer;
  ws: SendArgs[];
  runner: SendArgs[];
} {
  const ws: SendArgs[] = [];
  const runner: SendArgs[] = [];

  const server = {
    ws: { send: (...args: SendArgs) => void ws.push(args) },
    environments: {
      ssr: { hot: { send: (...args: SendArgs) => void runner.push(args) } },
    },
  } as unknown as ViteDevServer;

  return { server, ws, runner };
}

describe('bridgeHmrEventsToRunner', () => {
  it('forwards a custom payload to the runner and still sends the original', () => {
    const { server, ws, runner } = createServer();
    bridgeHmrEventsToRunner(server);

    server.ws.send({
      type: 'custom',
      event: 'file-changed',
      data: { file: '/project/src/App.vue' },
    });

    // This is the payload `unplugin-vue`'s compiled SFC listens for. Without
    // it reaching the runner, `_rerender_only` is false and every SFC edit
    // takes the state-resetting `reload` branch.
    expect(runner).toEqual([
      [{ type: 'custom', event: 'file-changed', data: { file: '/project/src/App.vue' } }],
    ]);
    expect(ws).toHaveLength(1);
  });

  it('accepts the (event, data) call form as well as a payload object', () => {
    const { server, runner } = createServer();
    bridgeHmrEventsToRunner(server);

    (server.ws.send as (event: string, data?: unknown) => void)('file-changed', {
      file: '/project/src/App.vue',
    });

    expect(runner).toEqual([
      [{ type: 'custom', event: 'file-changed', data: { file: '/project/src/App.vue' } }],
    ]);
  });

  it('does not forward update, full-reload or error payloads', () => {
    const { server, ws, runner } = createServer();
    bridgeHmrEventsToRunner(server);

    server.ws.send({ type: 'full-reload' });
    server.ws.send({ type: 'update', updates: [] });

    // Vite delivers these to the runner through its own channel already, and
    // this phase has no error overlay to feed. Forwarding them would only
    // duplicate what the runner and Vite's logger already do.
    expect(runner).toEqual([]);
    expect(ws).toHaveLength(2);
  });

  it('rewrites a symlinked file path in the runner copy only', () => {
    // `unplugin-vue` compares this `file` against the compiled module's
    // physical filename. Vite compiles through the realpath while the watcher
    // can report the link, and on macOS `/var` versus `/private/var` makes
    // that the everyday case rather than an exotic one.
    const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vue-stdout-bridge-')));
    const real = path.join(root, 'real');
    mkdirSync(real);
    const file = path.join(real, 'App.vue');
    writeFileSync(file, '<template></template>');
    const link = path.join(root, 'link');
    symlinkSync(real, link);
    const linkedFile = path.join(link, 'App.vue');

    const { server, ws, runner } = createServer();
    bridgeHmrEventsToRunner(server);
    server.ws.send({ type: 'custom', event: 'file-changed', data: { file: linkedFile } });

    expect(runner[0]).toEqual([
      { type: 'custom', event: 'file-changed', data: { file } },
    ]);
    // The original payload keeps the path the watcher actually reported.
    expect(ws[0]).toEqual([
      { type: 'custom', event: 'file-changed', data: { file: linkedFile } },
    ]);
  });

  it('leaves the path alone under preserveSymlinks', () => {
    const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vue-stdout-bridge-')));
    const real = path.join(root, 'real');
    mkdirSync(real);
    writeFileSync(path.join(real, 'App.vue'), '<template></template>');
    symlinkSync(real, path.join(root, 'link'));
    const linkedFile = path.join(root, 'link', 'App.vue');

    const { server, runner } = createServer();
    bridgeHmrEventsToRunner(server, { preserveSymlinks: true });
    server.ws.send({ type: 'custom', event: 'file-changed', data: { file: linkedFile } });

    expect(runner[0]).toEqual([
      { type: 'custom', event: 'file-changed', data: { file: linkedFile } },
    ]);
  });

  it('forwards a custom payload whose data is not a file record, untouched', () => {
    const { server, runner } = createServer();
    bridgeHmrEventsToRunner(server);

    server.ws.send({ type: 'custom', event: 'something-else', data: [1, 2, 3] });
    server.ws.send({ type: 'custom', event: 'file-changed', data: null });

    expect(runner).toEqual([
      [{ type: 'custom', event: 'something-else', data: [1, 2, 3] }],
      [{ type: 'custom', event: 'file-changed', data: null }],
    ]);
  });
});
