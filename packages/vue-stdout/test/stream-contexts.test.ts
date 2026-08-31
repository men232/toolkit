import { h } from 'vue';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/createApp';
import { useStderr } from '../src/hooks/useStderr';
import { useStdin } from '../src/hooks/useStdin';
import { useStdout } from '../src/hooks/useStdout';
import { createStdin } from './helpers/create-stdin';
import { createStdout } from './helpers/create-stdout';

/**
 * Mounts a component whose `setup()` reads one or more of the stream hooks
 * and stashes the result on `captured`, so the assertions below can inspect
 * what the hook actually returned. Never uses the real `process.std*`
 * streams -- see `test/setup/no-real-raw-mode.ts` for why that's a hard
 * requirement, not just a style choice, once stdin is involved.
 */
function mountAndCapture<T>(setup: () => T) {
  const stdin = createStdin();
  const stdout = createStdout(20);
  const stderr = createStdout(20);
  let captured!: T;

  const app = createApp({
    setup() {
      captured = setup();
      return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
    },
  });
  app.mount({ stdin, stdout, stderr });

  return { app, stdin, stdout, stderr, captured };
}

describe('useStdin', () => {
  it('exposes the stdin stream passed to render()', () => {
    const { app, stdin, captured } = mountAndCapture(() => useStdin());

    expect(captured.stdin).toBe(stdin);

    app.unmount();
  });

  it('exposes isRawModeSupported, true for the fake stdin (it is a TTY)', () => {
    const { app, captured } = mountAndCapture(() => useStdin());

    expect(captured.isRawModeSupported).toBe(true);

    app.unmount();
  });

  it('setRawMode(true)/(false) drives the same ref-counted subscription useInput uses', () => {
    const { app, stdin, captured } = mountAndCapture(() => useStdin());

    captured.setRawMode(true);
    expect(stdin.setRawMode).toHaveBeenCalledExactlyOnceWith(true);

    captured.setRawMode(false);
    expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);

    app.unmount();
  });

  it('isRawModeSupported is false for a non-TTY stdin, and setRawMode(true) throws', () => {
    const stdin = createStdin(false);
    const stdout = createStdout(20);
    const stderr = createStdout(20);
    let captured!: ReturnType<typeof useStdin>;

    expect(() =>
      createApp({
        setup() {
          captured = useStdin();
          expect(captured.isRawModeSupported).toBe(false);
          captured.setRawMode(true);
          return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
        },
      }).mount({ stdin, stdout, stderr }),
    ).toThrow(/raw mode is not supported/i);
  });
});

describe('useStdout', () => {
  it('exposes the stdout stream passed to render()', () => {
    const { app, stdout, captured } = mountAndCapture(() => useStdout());

    expect(captured.stdout).toBe(stdout);

    app.unmount();
  });

  it('write() writes straight to stdout', () => {
    const { app, stdout, captured } = mountAndCapture(() => useStdout());

    captured.write('hello from useStdout');

    expect(stdout.getWrites()).toContain('hello from useStdout');

    app.unmount();
  });
});

describe('useStderr', () => {
  it('exposes the stderr stream passed to render()', () => {
    const { app, stderr, captured } = mountAndCapture(() => useStderr());

    expect(captured.stderr).toBe(stderr);

    app.unmount();
  });

  it('write() writes straight to stderr', () => {
    const { app, stderr, captured } = mountAndCapture(() => useStderr());

    captured.write('oops');

    expect(stderr.getWrites()).toContain('oops');

    app.unmount();
  });
});
