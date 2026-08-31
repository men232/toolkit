import { h } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/createApp';
import { useApp } from '../src/hooks/useApp';
import { useInput } from '../src/hooks/useInput';
import { createStdin, emitReadable } from './helpers/create-stdin';
import { createStdout } from './helpers/create-stdout';

/**
 * Mounts a component whose `setup()` calls `useApp()` and hands the returned
 * `exit` straight back to the caller, wired to a fake stdin/stdout -- never
 * the real `process.stdin`/`process.stdout`.
 */
function mountWithApp() {
  const stdin = createStdin();
  const stdout = createStdout(20);
  let exit: (error?: Error) => void = () => {
    throw new Error('exit() called before setup() ran');
  };

  const app = createApp({
    setup() {
      ({ exit } = useApp());
      return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
    },
  });
  app.mount({ stdin, stdout });

  return { app, stdin, stdout, exit: (error?: Error) => exit(error) };
}

describe('useApp', () => {
  it('exit() with no argument resolves waitUntilExit()', async () => {
    const { app, exit } = mountWithApp();

    const exited = app.waitUntilExit();
    exit();

    await expect(exited).resolves.toBeUndefined();
  });

  it('exit(error) rejects waitUntilExit() with that error', async () => {
    const { app, exit } = mountWithApp();
    const error = new Error('boom');

    const exited = app.waitUntilExit();
    exit(error);

    await expect(exited).rejects.toBe(error);
  });

  it('exit() tears down like unmount(): raw mode released, resize listener removed', async () => {
    const handler = vi.fn();
    const stdin = createStdin();
    const stdout = createStdout(20);
    let exit: (error?: Error) => void = () => {};

    createApp({
      setup() {
        ({ exit } = useApp());
        useInput(handler);
        return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
      },
    }).mount({ stdin, stdout });

    expect(stdin.setRawMode).toHaveBeenCalledExactlyOnceWith(true);
    expect(stdout.listenerCount('resize')).toBeGreaterThan(0);

    exit();
    await new Promise<void>(resolve => process.nextTick(resolve));

    expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);
    expect(stdin.listenerCount('readable')).toBe(0);
    expect(stdout.listenerCount('resize')).toBe(0);
  });

  it('calling exit() twice does not double-settle or double-teardown', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { app, exit } = mountWithApp();
    const first = new Error('first');
    const second = new Error('second');

    const exited = app.waitUntilExit();
    exit(first);
    // Second call must be a no-op: no double `app.unmount()` (which would
    // print Vue's "Cannot unmount an app that is not mounted" dev warning)
    // and no attempt to settle the already-settled promise with a different
    // outcome.
    expect(() => exit(second)).not.toThrow();

    await expect(exited).rejects.toBe(first);
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('exit() followed by unmount() does not double-teardown or re-settle', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { app, exit } = mountWithApp();

    const exited = app.waitUntilExit();
    exit();
    expect(() => app.unmount()).not.toThrow();

    await expect(exited).resolves.toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('unmount() followed by exit(error) does not reject an already-resolved waitUntilExit', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { app, exit } = mountWithApp();

    const exited = app.waitUntilExit();
    app.unmount();
    expect(() => exit(new Error('too late'))).not.toThrow();

    await expect(exited).resolves.toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

describe('exitOnCtrlC', () => {
  it('exits the app through the same path as unmount() when true (the default)', async () => {
    const handler = vi.fn();
    const stdin = createStdin();
    const stdout = createStdout(20);

    const app = createApp({
      setup() {
        useInput(handler);
        return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
      },
    });
    app.mount({ stdin, stdout });

    const exited = app.waitUntilExit();

    emitReadable(stdin, '\u0003'); // Ctrl+C

    await expect(exited).resolves.toBeUndefined();
    // Same teardown `unmount()` produces: raw mode released, listener gone.
    expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);
    expect(stdin.listenerCount('readable')).toBe(0);
    expect(stdout.listenerCount('resize')).toBe(0);

    // Confirms teardown actually ran (not just a coincidentally-resolved
    // promise): the app now rejects further use the same way a plain
    // `unmount()` would.
    expect(() => app.mount({ stdout: createStdout(20) })).toThrow(
      /already exited/,
    );
  });

  it('does not exit the app when exitOnCtrlC is false', async () => {
    const handler = vi.fn();
    const stdin = createStdin();
    const stdout = createStdout(20);

    const app = createApp({
      setup() {
        useInput(handler);
        return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
      },
    });
    app.mount({ stdin, stdout, exitOnCtrlC: false });

    emitReadable(stdin, '\u0003'); // Ctrl+C

    // The handler itself receives it (already covered by
    // `test/use-input.test.ts`); the point here is that the app is still
    // alive -- raw mode is still on and its exit has not settled. (This last
    // check used to be `rerender()` not throwing; with `rerender()` gone,
    // asking the exit promise directly is both available and stricter.)
    expect(stdin.setRawMode).toHaveBeenLastCalledWith(true);

    const settled = vi.fn();
    app.waitUntilExit().then(settled, settled);
    await new Promise<void>(resolve => process.nextTick(resolve));
    expect(settled).not.toHaveBeenCalled();

    app.unmount();
  });

  it('never fires when nothing has put stdin into raw mode', async () => {
    // No `useInput`/`useStdin` consumer mounted -- `container.input` never
    // attaches to `stdin`, so a raw Ctrl+C byte pushed at it directly (not
    // through `emitReadable`, which relies on the `readable` listener this
    // scenario deliberately has none of) must not reach the exit path.
    const stdin = createStdin();
    const stdout = createStdout(20);

    const app = createApp(
      { render: () => h('stdout-box', {}, h('stdout-text', {}, 'x')) },
    );
    app.mount({ stdin, stdout });

    expect(stdin.listenerCount('readable')).toBe(0);

    app.unmount();
  });
});
