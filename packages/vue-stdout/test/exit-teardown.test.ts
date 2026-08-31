// Raw mode and the terminal cursor are process-global state
// (`src/Container.ts#destroy`). A clean `unmount()`/`exit()` already restores
// both (covered throughout `test/use-app.test.ts` and elsewhere) -- what
// these tests cover instead is everything that skips that path: the process
// receiving SIGINT/SIGTERM, or an uncaught throw from a later render (after
// the initial `app.mount()` already succeeded) crashing the process outright.
//
// `src/render.ts` handles both through `signal-exit`'s `onExit`, the same
// dependency ink itself uses for this. Mocked here rather than exercised for
// real: actually raising a signal or crashing the process would kill the
// test worker (the whole reason `onExit`'s callback exists -- Node runs it
// synchronously right before the process actually dies, which is not
// something a test can observe from the far side). What *is* testable, and
// what these assert, is `render()`'s own contract with that dependency:
// exactly one listener registered per app, invoking it tears the
// terminal down the same way `exit()` does, and it is removed again on every
// path out of `render()` (`unmount()`, `useApp().exit()`, and a mount that
// throws) so a long-running host process accumulates none for instances
// already gone.
import { h, onScopeDispose } from 'vue';
import { onExit } from 'signal-exit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/createApp';
import { useApp } from '../src/hooks/useApp';
import { useInput } from '../src/hooks/useInput';
import { createStdin } from './helpers/create-stdin';
import { createStdout } from './helpers/create-stdout';

vi.mock('signal-exit', () => ({
  onExit: vi.fn(() => vi.fn()),
}));

const onExitMock = vi.mocked(onExit);

beforeEach(() => {
  onExitMock.mockClear();
});

describe('render() / process-exit teardown', () => {
  it('registers exactly one process-exit listener per app', () => {
    const app = createApp(
      { render: () => h('stdout-box', {}, h('stdout-text', {}, 'x')) },
    );
    app.mount({ stdin: createStdin(), stdout: createStdout(20) });

    expect(onExitMock).toHaveBeenCalledTimes(1);
    app.unmount();
  });

  it('tears the terminal down like unmount() when the process-exit listener fires', async () => {
    const stdin = createStdin();
    const stdout = createStdout(20);

    const app = createApp({
      setup() {
        useInput(vi.fn());
        return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
      },
    });
    app.mount({ stdin, stdout });

    expect(stdin.setRawMode).toHaveBeenLastCalledWith(true);

    const [exitCallback] = onExitMock.mock.calls[0]!;
    const exited = app.waitUntilExit();

    // Simulates the process actually exiting -- a signal, an uncaught
    // exception from a later render, or a plain `process.exit()` -- without
    // literally raising one, which would kill the test worker.
    exitCallback(0, null);

    await expect(exited).resolves.toBeUndefined();
    expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);
    expect(stdin.listenerCount('readable')).toBe(0);
    expect(stdout.listenerCount('resize')).toBe(0);
  });

  it('removes its process-exit listener on a normal unmount(), so nothing leaks', async () => {
    const app = createApp(
      { render: () => h('stdout-box', {}, h('stdout-text', {}, 'x')) },
    );
    app.mount({ stdin: createStdin(), stdout: createStdout(20) });

    const removeListener = onExitMock.mock.results[0]!.value as ReturnType<
      typeof vi.fn
    >;
    expect(removeListener).not.toHaveBeenCalled();

    app.unmount();

    // `teardown()` schedules the actual removal via `queueMicrotask` rather
    // than calling it synchronously -- see its own comment in
    // `src/render.ts` (calling it synchronously from inside a real
    // `signal-exit` callback would splice the live listener array
    // `Emitter.emit()` is mid-iteration over, skipping whichever app
    // was registered right after this one; reproduced in
    // `test/exit-teardown-real-signal-exit.test.ts`). One microtask tick is
    // enough for it to have run by the time this checks.
    await Promise.resolve();

    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it('removes its process-exit listener when useApp().exit() runs teardown first', async () => {
    let exit: (error?: Error) => void = () => {
      throw new Error('exit() called before setup() ran');
    };

    createApp({
      setup() {
        ({ exit } = useApp());
        return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
      },
    }).mount({ stdin: createStdin(), stdout: createStdout(20) });

    const removeListener = onExitMock.mock.results[0]!.value as ReturnType<
      typeof vi.fn
    >;

    exit();
    await new Promise<void>(resolve => process.nextTick(resolve));

    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it('removes its process-exit listener when app.mount() throws, so a failed mount does not leak either', () => {
    expect(() =>
      createApp({
        setup() {
          throw new Error('boom');
        },
        render: () => h('stdout-box', {}, h('stdout-text', {}, 'x')),
      }).mount({ stdin: createStdin(), stdout: createStdout(20) }),
    ).toThrow('boom');

    expect(onExitMock).toHaveBeenCalledTimes(1);
    const removeListener = onExitMock.mock.results[0]!.value as ReturnType<
      typeof vi.fn
    >;
    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it('still releases raw mode and settles waitUntilExit() when a disposer throws during unmount()', async () => {
    const stdin = createStdin();
    const stdout = createStdout(20);

    const app = createApp({
      setup() {
        // Registered *before* `useInput()` below, so it sits earlier in
        // Vue's `EffectScope#cleanups` array and its throw pre-empts
        // `useInput`'s own disposer (which would otherwise call
        // `setRawMode(false)` itself and mask exactly the gap this test
        // exists to catch). `EffectScope#stop()` runs that array with a
        // bare `for` loop and no try/catch, so this throw stops the loop
        // dead -- `useInput`'s disposer never runs, and only
        // `Container#destroy()` (reached via `createApp.ts`'s
        // `teardownMount()`/`try`/`finally`) is left to release raw mode.
        onScopeDispose(() => {
          throw new Error('disposer boom');
        });
        useInput(vi.fn());
        return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
      },
    });
    app.mount({ stdin, stdout });

    expect(stdin.setRawMode).toHaveBeenLastCalledWith(true);

    const exited = app.waitUntilExit();

    // The disposer's throw still propagates out of `unmount()` itself --
    // `render.ts`'s `finally` guarantees the terminal restore and the
    // promise settling, not that the original error is swallowed.
    expect(() => app.unmount()).toThrow('disposer boom');

    await expect(exited).resolves.toBeUndefined();
    expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);
    expect(stdin.listenerCount('readable')).toBe(0);
    expect(stdout.listenerCount('resize')).toBe(0);
  });

  it('gives two concurrent instances independent listeners -- invoking one does not touch the other', async () => {
    const stdinA = createStdin();
    const stdoutA = createStdout(20);
    const stdinB = createStdin();
    const stdoutB = createStdout(20);

    const makeApp = () => ({
      setup() {
        useInput(vi.fn());
        return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
      },
    });

    const appA = createApp(makeApp());
    appA.mount({ stdin: stdinA, stdout: stdoutA });
    const appB = createApp(makeApp());
    appB.mount({ stdin: stdinB, stdout: stdoutB });

    expect(onExitMock).toHaveBeenCalledTimes(2);
    const [callbackA] = onExitMock.mock.calls[0]!;
    const [callbackB] = onExitMock.mock.calls[1]!;
    const removeA = onExitMock.mock.results[0]!.value as ReturnType<
      typeof vi.fn
    >;
    const removeB = onExitMock.mock.results[1]!.value as ReturnType<
      typeof vi.fn
    >;

    const exitedA = appA.waitUntilExit();
    callbackA(0, null);
    await expect(exitedA).resolves.toBeUndefined();

    // Instance A is torn down; app B, still alive, is untouched by it.
    expect(stdinA.setRawMode).toHaveBeenLastCalledWith(false);
    expect(removeA).toHaveBeenCalledTimes(1);
    expect(stdinB.setRawMode).toHaveBeenLastCalledWith(true);
    expect(removeB).not.toHaveBeenCalled();

    const exitedB = appB.waitUntilExit();
    callbackB(0, null);
    await expect(exitedB).resolves.toBeUndefined();

    expect(stdinB.setRawMode).toHaveBeenLastCalledWith(false);
    expect(removeB).toHaveBeenCalledTimes(1);
  });
});
