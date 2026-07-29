import { isSkip } from '@andrew_l/toolkit';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { APP_INSTANCE_STATE } from './app.js';
import {
  type ManagedThread,
  initThread,
  restartThreadApp,
  setupThreadApp,
  shutdownThreadApp,
  startThreadApp,
  waitForThreadReady,
} from './managedThread.ts';

const longRunningApp = fileURLToPath(
  new URL('./__fixtures__/long-running-app.ts', import.meta.url),
);
const crashApp = fileURLToPath(
  new URL('./__fixtures__/crash-app.ts', import.meta.url),
);

// Track spawned threads so a failed assertion never leaks a child process.
const spawned: ManagedThread[] = [];

function track(w: ManagedThread): ManagedThread {
  spawned.push(w);
  return w;
}

afterEach(() => {
  for (const w of spawned.splice(0)) {
    try {
      w.child?.kill('SIGKILL');
    } catch {}
  }
});

describe('shutdownThreadApp', () => {
  it('child exits cleanly on its own (not via SIGKILL)', async () => {
    const w = track(initThread(1, longRunningApp, {}));

    let exit:
      { code: number | null; signal: NodeJS.Signals | null } | undefined;
    w.eventBus.on('exit', (code, signal) => {
      exit = { code, signal };
    });

    await waitForThreadReady(w);
    await setupThreadApp(w);
    await startThreadApp(w);
    await shutdownThreadApp(w);

    expect(exit).toBeDefined();
    // Bug 1: without `onShutdown: () => processGraceful()` the child hangs and
    // is force-killed with SIGKILL (code=null) after the exit timeout.
    expect(exit!.signal).not.toBe('SIGKILL');
    expect(exit!.code).toBe(0);
  }, 15_000);
});

describe('restartThreadApp', () => {
  it('contains a give-up (max restarts) instead of rejecting', async () => {
    const w = track(initThread(1, longRunningApp, {}));

    const logs: ManagedThread.LogEntry[] = [];
    w.eventBus.on('log', entry => logs.push(entry));

    await waitForThreadReady(w);

    // Force the give-up branch without depending on the private MAX_RESTARTS.
    w.restartCount = 999;

    const result = await restartThreadApp(w);
    expect(isSkip(result)).toBe(true);
    expect(result.code).toBe('thread.restart.give-up');
    expect(logs.some(l => l.level === 'error')).toBe(true);
  }, 15_000);

  it('contains "Child exited before ready" when a respawn fails', async () => {
    // __inheritIO:false keeps the child's crash stack out of the test output.
    const w = track(initThread(1, crashApp, { __inheritIO: false }));

    const logs: ManagedThread.LogEntry[] = [];
    w.eventBus.on('log', entry => logs.push(entry));

    // The initial spawn already fails; the crash fixture never reaches RUN,
    // so no automatic restart fires and this respawn is the only attempt.
    w.restartCount = 0;

    // Restart now returns a typed ExecResult skip instead of rejecting, so a
    // fire-and-forget caller can never crash the process.
    const result = await restartThreadApp(w);
    expect(isSkip(result)).toBe(true);
    expect(result.code).toBe('thread.exit-before-ready');
    expect(w.state).toBe(APP_INSTANCE_STATE.SHUTDOWN);
    expect(logs.some(l => l.level === 'error')).toBe(true);
  }, 15_000);
});
