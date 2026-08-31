import { h, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createApp as createAppInteractiveByDefault } from '../src/createApp';
import type { MountOptions } from '../src/createApp';
import { Container } from '../src/Container';
import { createStdin } from './helpers/create-stdin';
import { createStdout } from './helpers/create-stdout';

const box = (props: any, ...kids: any[]) => h('stdout-box', props, kids);
const span = (props: any, ...kids: any[]) => h('stdout-text', props, kids);

const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

// Built from `String.fromCharCode` rather than a `\x1b`/`` literal so there's
// no ambiguity about whether the escape byte actually made it into this
// source file (same convention as `test/container.test.ts`).
const ESC = String.fromCharCode(27);

/**
 * `is-in-ci` (`src/createApp.ts`'s `resolveInteractive`) computes its exported
 * value once, at import time, from `process.env` -- there is no per-call
 * check to intercept. `vi.doMock` + `vi.resetModules()` + a dynamic
 * `import()` gets a fresh module registry with the mocked value baked in,
 * without disturbing the plain top-level `import` other tests in this file
 * use (which keeps the real, non-CI `is-in-ci`).
 *
 * Mounts inside the `try`, not after it: `resolveInteractive` runs during
 * `mount()`, so the mock has to still be installed at that point.
 */
async function mountInCi(
  component: Parameters<typeof createAppInteractiveByDefault>[0],
  options?: MountOptions,
) {
  vi.resetModules();
  vi.doMock('is-in-ci', () => ({ default: true }));
  try {
    const { createApp } = await import('../src/createApp');
    const app = createApp(component);
    app.mount(options);
    return app;
  } finally {
    vi.doUnmock('is-in-ci');
    vi.resetModules();
  }
}

describe('non-interactive mode', () => {
  it('is non-interactive when stdout is not a TTY (no CI)', async () => {
    const stdout = createStdout(20, false);
    const app = createAppInteractiveByDefault({ render: () => box({}, span({}, 'hello')) });
    app.mount({ stdout });

    await flush();

    // Nothing at all is written while the app is alive -- no erase
    // sequence, no cursor manipulation, not even the frame itself yet.
    expect(stdout.getWrites()).toEqual([]);

    app.unmount();

    // Only the final frame, written once, at unmount.
    expect(stdout.getWrites()).toHaveLength(1);
    expect(stdout.get()).toContain('hello');
    expect(stdout.get().includes(ESC)).toBe(false);
  });

  it('writes only the final frame, not every intermediate one', async () => {
    const stdout = createStdout(20, false);
    const label = ref('first');
    const app = createAppInteractiveByDefault({ render: () => box({}, span({}, label.value)) });
    app.mount({ stdout });

    await flush();
    expect(stdout.getWrites()).toEqual([]);

    label.value = 'second';
    await nextTick();
    await flush();

    // Still nothing -- the intermediate ("first") frame was never written.
    expect(stdout.getWrites()).toEqual([]);

    app.unmount();

    expect(stdout.getWrites()).toHaveLength(1);
    expect(stdout.get()).toContain('second');
    expect(stdout.get()).not.toContain('first');
  });

  it('never subscribes to stdout resize events', async () => {
    const stdout = createStdout(20, false);
    const app = createAppInteractiveByDefault({ render: () => box({}, span({}, 'x')) });
    app.mount({ stdout });

    await flush();
    expect(stdout.listenerCount('resize')).toBe(0);

    app.unmount();
  });

  it('CI takes precedence over an interactive TTY stdout', async () => {
    const stdout = createStdout(20, true); // a TTY -- would be interactive outside CI
    const app = await mountInCi({ render: () => box({}, span({}, 'hello')) }, { stdout });

    await flush();
    expect(stdout.getWrites()).toEqual([]);

    app.unmount();

    expect(stdout.getWrites()).toHaveLength(1);
    expect(stdout.get()).toContain('hello');
    expect(stdout.get().includes(ESC)).toBe(false);
  });

  it('the explicit interactive:true option overrides CI + a non-TTY stdout', async () => {
    const stdout = createStdout(20, false);
    const app = await mountInCi({ render: () => box({}, span({}, 'hello')) }, { stdout, interactive: true });

    await flush();

    // Interactive mode writes as it goes: the first frame is on screen well
    // before unmount, where non-interactive mode would still have written
    // nothing at all. (It used to be asserted via the escape sequences in
    // that write; the constructor no longer emits a `clearTerminal`, and a
    // first frame with no cursor position carries no escapes of its own, so
    // the frame's own text is what distinguishes the two modes now.)
    expect(stdout.getWrites().length).toBeGreaterThan(0);
    expect(stdout.get()).toContain('hello');

    app.unmount();
  });

  it('the explicit interactive:false option overrides an interactive TTY stdout (no CI)', async () => {
    const stdout = createStdout(20, true);
    const app = createAppInteractiveByDefault({ render: () => box({}, span({}, 'hello')) });
    app.mount({ stdout, interactive: false });

    await flush();
    expect(stdout.getWrites()).toEqual([]);

    app.unmount();

    expect(stdout.getWrites()).toHaveLength(1);
    expect(stdout.get()).toContain('hello');
  });

  it('writes nothing on destroy() if the container never rendered a frame at all', () => {
    const stdout = createStdout(20, false);
    const container = new Container({
      debug: false,
      exitOnCtrlC: true,
      interactive: false,
      stdin: createStdin(),
      stdout,
      stderr: createStdout(20, false),
    });

    // Deliberately no `await flush()` -- the constructor's own scheduled
    // render never gets a chance to fire, so `onFrame` never runs and
    // `lastFrame` (`src/Container.ts`) is still `undefined`. `destroy()`
    // must not turn that into a stray blank-line write.
    container.destroy();

    expect(stdout.getWrites()).toEqual([]);
  });

  it('exposes the resolved flag as Container#interactive, for later tasks to read without a second detection', () => {
    const interactiveContainer = new Container({
      debug: false,
      exitOnCtrlC: true,
      interactive: true,
      stdin: createStdin(),
      stdout: createStdout(20, true),
      stderr: createStdout(20, true),
    });

    expect(interactiveContainer.interactive).toBe(true);
    interactiveContainer.destroy();

    const nonInteractiveContainer = new Container({
      debug: false,
      exitOnCtrlC: true,
      interactive: false,
      stdin: createStdin(),
      stdout: createStdout(20, false),
      stderr: createStdout(20, false),
    });

    expect(nonInteractiveContainer.interactive).toBe(false);
    nonInteractiveContainer.destroy();
  });
});
