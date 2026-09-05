// `alternateScreen` and `debug`.
//
// Neither option can be verified against a *real* terminal's alternate
// buffer from here -- there is no real terminal on the other end of a fake
// `stdout` to actually flip. What these tests assert instead is the
// contract this project owns: which escape sequences are written, in what
// order, exactly once per concurrent group of instances (`alternateScreen`),
// and that `debug` mode never erases or diffs regardless of what else is
// turned on. Manually pointing a real terminal at `alternateScreen: true`
// and watching it switch buffers is an observation, not something this file
// claims to verify. That split is deliberate: what a real terminal and a real
// alternate buffer do is checked by hand and *called an observation* -- this
// project has twice caught reports where reasoning was presented as
// verification.
import { describe, expect, it, vi } from 'vitest';
import { h, nextTick, onScopeDispose, ref } from 'vue';
import { Container } from '../src/Container';
import { createApp } from '../src/createApp';
import { useApp } from '../src/hooks/useApp';
import { createStdin } from './helpers/create-stdin';
import { createStdout } from './helpers/create-stdout';

// Built from `String.fromCharCode` rather than a `\x1b`/`` literal, matching
// `test/container.test.ts`'s own convention -- no ambiguity about whether the
// escape byte actually made it into this source file.
const ESC = String.fromCharCode(27);
const enterAlternativeScreen = `${ESC}[?1049h`;
const exitAlternativeScreen = `${ESC}[?1049l`;
const cursorHide = `${ESC}[?25l`;
const cursorShow = `${ESC}[?25h`;
const clearTerminal = `${ESC}[2J${ESC}[3J${ESC}[H`;

const box = (props: any, ...kids: any[]) => h('stdout-box', props, kids);
const span = (props: any, ...kids: any[]) => h('stdout-text', props, kids);
const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

function makeContainer(
  overrides: Partial<ConstructorParameters<typeof Container>[0]> = {},
) {
  const stdin = createStdin();
  const stdout = createStdout(20, true);
  const stderr = createStdout(20, true);
  const container = new Container({
    debug: false,
    exitOnCtrlC: true,
    interactive: true,
    stdin,
    stdout,
    stderr,
    ...overrides,
  });

  return { container, stdin, stdout, stderr };
}

describe('alternateScreen', () => {
  it('enters the alternate screen and hides the cursor at construction', () => {
    const { container, stdout } = makeContainer({ alternateScreen: true });

    const written = stdout.getWrites().join('');
    expect(written).toContain(enterAlternativeScreen);
    expect(written).toContain(cursorHide);
    expect(written.indexOf(enterAlternativeScreen)).toBeLessThan(
      written.indexOf(cursorHide),
    );

    container.destroy();
  });

  it('leaves the alternate screen and shows the cursor again on destroy()', () => {
    const { container, stdout } = makeContainer({ alternateScreen: true });

    container.destroy();

    const written = stdout.getWrites().join('');
    expect(written).toContain(exitAlternativeScreen);
    expect(written).toContain(cursorShow);
  });

  it('defaults to off -- no alternate-screen escape sequence at all', () => {
    const { container, stdout } = makeContainer();

    container.destroy();

    const written = stdout.getWrites().join('');
    expect(written).not.toContain(enterAlternativeScreen);
    expect(written).not.toContain(exitAlternativeScreen);
  });

  it('is ignored in non-interactive mode, per ink -- there is no display to switch away from', () => {
    const { container, stdout } = makeContainer({
      alternateScreen: true,
      interactive: false,
    });

    container.destroy();

    const written = stdout.getWrites().join('');
    expect(written).not.toContain(enterAlternativeScreen);
    expect(written).not.toContain(exitAlternativeScreen);
    expect(container.alternateScreen).toBe(false);
  });

  // `debug` x `alternateScreen` was the unconsidered combination -- every
  // other site that gates on `interactive`
  // folds in `debug` too (`onResize`, `onStatic`, `onFrame`,
  // `writeConsoleOutput`, `clear`, `canComputeFrame`, `destroy`'s non-interactive
  // branch), but the `alternateScreen` resolution in the constructor didn't.
  // `debug`'s whole contract is "append forever, nothing ever erased or
  // discarded" -- entering the alternate screen and then wholesale discarding
  // it at `destroy()` (handing the real primary buffer back with whatever was
  // in it) would silently throw away the very transcript `debug` exists to
  // keep. `debug` wins: the alternate screen is never entered.
  describe('combined with debug', () => {
    it('never enters the alternate screen when debug is also on', () => {
      const { container, stdout } = makeContainer({
        debug: true,
        alternateScreen: true,
      });

      expect(container.alternateScreen).toBe(false);

      const written = stdout.getWrites().join('');
      expect(written).not.toContain(enterAlternativeScreen);

      container.destroy();

      expect(stdout.getWrites().join('')).not.toContain(exitAlternativeScreen);
    });

    it('still writes every frame as its own appended output, unaffected by alternateScreen', () => {
      const { container, stdout } = makeContainer({
        debug: true,
        alternateScreen: true,
      });

      container.onFrame('one');
      container.onFrame('two');

      expect(stdout.getWrites()).toEqual(['one\n', 'two\n']);

      container.destroy();
    });

    it('does not block a concurrent non-debug app from entering the alternate screen', () => {
      const stdin = createStdin();
      const stdout = createStdout(20, true);
      const stderr = createStdout(20, true);

      const debugInstance = new Container({
        debug: true,
        exitOnCtrlC: true,
        interactive: true,
        alternateScreen: true,
        stdin,
        stdout,
        stderr,
      });

      const normalInstance = new Container({
        debug: false,
        exitOnCtrlC: true,
        interactive: true,
        alternateScreen: true,
        stdin,
        stdout,
        stderr,
      });

      expect(debugInstance.alternateScreen).toBe(false);
      expect(normalInstance.alternateScreen).toBe(true);

      const written = stdout.getWrites().join('');
      expect(written).toContain(enterAlternativeScreen);
      expect(written.split(enterAlternativeScreen).length - 1).toBe(1);

      debugInstance.destroy();
      // The debug app never acquired the alternate screen, so its
      // destroy() must not release it out from under the still-live normal
      // app.
      expect(stdout.getWrites().join('')).not.toContain(exitAlternativeScreen);

      normalInstance.destroy();
      expect(stdout.getWrites().join('')).toContain(exitAlternativeScreen);
    });
  });

  describe('two concurrent instances sharing one stdout', () => {
    it('enters only once, and exits only once every app has left', () => {
      const stdin = createStdin();
      const stdout = createStdout(20, true);
      const stderr = createStdout(20, true);

      const make = () =>
        new Container({
          debug: false,
          exitOnCtrlC: true,
          interactive: true,
          alternateScreen: true,
          stdin,
          stdout,
          stderr,
        });

      const first = make();
      const writesAfterFirst = stdout.getWrites().join('');
      expect(writesAfterFirst.split(enterAlternativeScreen).length - 1).toBe(1);

      const second = make();
      const writesAfterSecond = stdout.getWrites().join('');
      // The second app joining an already-switched buffer must not
      // write the escape sequence again.
      expect(writesAfterSecond.split(enterAlternativeScreen).length - 1).toBe(
        1,
      );

      // The first to leave must NOT flip the buffer back -- the second
      // app is still alive and still expects to be drawing into the
      // alternate one. If this fired, the second app's next frame
      // would land on top of the user's primary-buffer shell history
      // instead of the buffer meant to hold it.
      first.destroy();
      const writesAfterFirstDestroy = stdout.getWrites().join('');
      expect(writesAfterFirstDestroy).not.toContain(exitAlternativeScreen);

      // Only once the last app leaves does the buffer actually flip
      // back, and only once.
      second.destroy();
      const writesAfterBothDestroyed = stdout.getWrites().join('');
      expect(
        writesAfterBothDestroyed.split(exitAlternativeScreen).length - 1,
      ).toBe(1);
    });

    it('does not corrupt a fresh pair started after the first pair fully tore down', () => {
      // Guards against a stale ref count surviving in the module-level map
      // (keyed by `stdout`, not cleared between tests) once every app
      // sharing that particular `stdout` has gone.
      const stdin = createStdin();
      const stdout = createStdout(20, true);
      const stderr = createStdout(20, true);

      const make = () =>
        new Container({
          debug: false,
          exitOnCtrlC: true,
          interactive: true,
          alternateScreen: true,
          stdin,
          stdout,
          stderr,
        });

      const a = make();
      a.destroy();

      const b = make();
      const writesAfterB = stdout.getWrites().join('');
      expect(writesAfterB.split(enterAlternativeScreen).length - 1).toBe(2);
      b.destroy();

      const writesAfterBDestroy = stdout.getWrites().join('');
      expect(writesAfterBDestroy.split(exitAlternativeScreen).length - 1).toBe(
        2,
      );
    });
  });

  describe('leaving is unconditional -- every exit path reaches it', () => {
    it('a normal unmount()', () => {
      const stdout = createStdout(20, true);
      const app = createApp({ render: () => box({}, span({}, 'x')) });
      app.mount({ stdout, stdin: createStdin(), alternateScreen: true });

      app.unmount();

      expect(stdout.getWrites().join('')).toContain(exitAlternativeScreen);
    });

    it('useApp().exit()', async () => {
      const stdout = createStdout(20, true);
      let exit: (error?: Error) => void = () => {
        throw new Error('exit() called before setup() ran');
      };

      createApp({
        setup() {
          ({ exit } = useApp());
          return () => box({}, span({}, 'x'));
        },
      }).mount({ stdout, stdin: createStdin(), alternateScreen: true });

      exit();
      await flush();

      expect(stdout.getWrites().join('')).toContain(exitAlternativeScreen);
    });

    it('exit(error)', async () => {
      const stdout = createStdout(20, true);
      let exit: (error?: Error) => void = () => {
        throw new Error('exit() called before setup() ran');
      };

      const app = createApp({
        setup() {
          ({ exit } = useApp());
          return () => box({}, span({}, 'x'));
        },
      });
      app.mount({ stdout, stdin: createStdin(), alternateScreen: true });

      exit(new Error('boom'));
      await expect(app.waitUntilExit()).rejects.toThrow('boom');

      expect(stdout.getWrites().join('')).toContain(exitAlternativeScreen);
    });

    it('an uncaught throw from a disposer during unmount()', async () => {
      const stdout = createStdout(20, true);

      const app = createApp({
        setup() {
          onScopeDispose(() => {
            throw new Error('disposer boom');
          });
          return () => box({}, span({}, 'x'));
        },
      });
      app.mount({ stdout, stdin: createStdin(), alternateScreen: true });

      expect(() => app.unmount()).toThrow('disposer boom');
      await expect(app.waitUntilExit()).resolves.toBeUndefined();

      expect(stdout.getWrites().join('')).toContain(exitAlternativeScreen);
    });

    it('a mount that throws before render() ever returns an app', () => {
      const stdout = createStdout(20, true);

      expect(() =>
        createApp({
          setup() {
            throw new Error('boom');
          },
          render: () => box({}, span({}, 'x')),
        }).mount({ stdout, stdin: createStdin(), alternateScreen: true }),
      ).toThrow('boom');

      // `render()`'s own `catch` calls `container.destroy()` directly (not
      // through `teardown()`) precisely so a failed mount still frees
      // everything the constructor already allocated -- the alternate
      // screen included.
      expect(stdout.getWrites().join('')).toContain(exitAlternativeScreen);
    });
  });
});

describe('debug mode', () => {
  it('writes every frame as its own output, with nothing erased', () => {
    const { container, stdout } = makeContainer({ debug: true });

    container.onFrame('one');
    container.onFrame('two');

    const writes = stdout.getWrites();
    expect(writes).toEqual(['one\n', 'two\n']);
    // Neither write contains any escape sequence at all -- no cursor-up, no
    // eraseLines, nothing.
    expect(writes.join('')).not.toContain(ESC);

    container.destroy();
  });

  it('is independent of interactive -- writes on every frame even on a real TTY', () => {
    const { container, stdout } = makeContainer({
      debug: true,
      interactive: true,
    });

    container.onFrame('a');
    container.onFrame('b');

    expect(stdout.getWrites()).toEqual(['a\n', 'b\n']);

    container.destroy();
  });

  it('never diffs against the previous frame, even with incrementalRendering on', () => {
    const { container, stdout } = makeContainer({
      debug: true,
      incrementalRendering: true,
    });

    container.onFrame('line1\nline2\nline3');
    container.onFrame('line1\nCHANGED\nline3');

    // The full second frame, verbatim -- not an incremental line-walk
    // fragment (which would never contain the unchanged 'line1'/'line3'
    // text alongside cursor-move escapes in the same write).
    const writes = stdout.getWrites();
    expect(writes[1]).toBe('line1\nCHANGED\nline3\n');
    expect(writes[1]).not.toContain(ESC);

    container.destroy();
  });

  it('bypasses maxFps throttling -- every update reaches the terminal, not just the trailing one', async () => {
    vi.useFakeTimers();
    try {
      const stdout = createStdout(20);
      const label = ref('0');

      // Driven through `render()` (not a bare `Container`) so the real
      // `maxFps` default (30) and Vue's own scheduling are in play --
      // `debug` has to win the composition against both.
      const app = createApp({ render: () => box({}, span({}, label.value)) });
      app.mount({ stdout, stdin: createStdin(), debug: true });

      await flush();
      const writesAfterMount = stdout.getWrites().length;

      for (let i = 1; i <= 5; i++) {
        label.value = `v${i}`;
        await nextTick();
        await flush();
      }

      const writesDuringBurst = stdout.getWrites().length - writesAfterMount;
      // Unthrottled: all five updates reached the terminal as their own
      // writes -- a throttled run (see `test/max-fps.test.ts`) coalesces
      // this same burst down to strictly fewer than 5.
      expect(writesDuringBurst).toBe(5);

      app.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('writes <Static> content directly, without erasing the current frame first', () => {
    const { container, stdout } = makeContainer({ debug: true });

    container.onFrame('dynamic-frame');
    container.onStatic('permanent-one');

    const written = stdout.getWrites().join('');
    expect(written).toContain('dynamic-frame');
    expect(written).toContain('permanent-one');
    expect(written).not.toContain(`${ESC}[`);

    container.destroy();
  });

  it('passes patched console output straight through, with no erase/repaint dance', () => {
    const { container, stdout } = makeContainer({
      debug: true,
      patchConsole: true,
    });

    container.onFrame('frame-one');
    console.info('MARKER');

    const written = stdout.getWrites().join('');
    expect(written).toContain('frame-one');
    expect(written).toContain('MARKER');
    expect(written).not.toContain(`${ESC}[`);

    container.destroy();
  });

  it("clear() is a no-op -- an explicit erase would violate debug mode's own contract", () => {
    const { container, stdout } = makeContainer({ debug: true });

    container.onFrame('one');
    container.clear();

    expect(stdout.getWrites().join('')).not.toContain(clearTerminal);

    container.destroy();
  });

  it('does not write a duplicate final frame at destroy() -- debug already wrote it as it arrived', () => {
    const { container, stdout } = makeContainer({ debug: true });

    container.onFrame('only-frame');
    const writesBeforeDestroy = stdout.getWrites().length;

    container.destroy();

    expect(stdout.getWrites().length).toBe(writesBeforeDestroy);
  });
});
