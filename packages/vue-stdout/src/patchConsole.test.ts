import { describe, expect, it } from 'vitest';
import { patchConsole } from './patchConsole';

/**
 * Unit tests for the interception and formatting this module owns, in
 * isolation from `Container` -- see `test/patch-console.test.ts` for the
 * frame-erase/repaint behaviour `Container.writeConsoleOutput` builds on
 * top of this.
 */
describe('patchConsole', () => {
  it('routes console.log/info to "stdout", warn/error to "stderr", matching the real global console', () => {
    const calls: Array<{ stream: string; data: string }> = [];
    const restore = patchConsole((stream, data) => {
      calls.push({ stream, data });
    });

    try {
      console.log('a log line');
      console.info('an info line');
      console.warn('a warn line');
      console.error('an error line');
    } finally {
      restore();
    }

    expect(calls).toEqual([
      { stream: 'stdout', data: 'a log line\n' },
      { stream: 'stdout', data: 'an info line\n' },
      { stream: 'stderr', data: 'a warn line\n' },
      { stream: 'stderr', data: 'an error line\n' },
    ]);
  });

  it('formats exactly the way the real console does -- format specifiers and object inspection', () => {
    const calls: string[] = [];
    const restore = patchConsole((_stream, data) => {
      calls.push(data);
    });

    try {
      console.log('count: %d', 3);
      console.log({ a: 1 });
    } finally {
      restore();
    }

    // Stripped of ANSI escapes before comparing: `node:console`'s own
    // object inspection colorizes numbers whenever `FORCE_COLOR` is set in
    // the environment (this repo's `vitest.config.ts` pins it for
    // deterministic ANSI output elsewhere in the render pipeline) --
    // exactly the same behaviour the real global `console.log({a: 1})`
    // would have, and `patch-console` itself inherits the same quirk since
    // it is built the same way (a real `console.Console`). Not something
    // this module's own formatting introduces.
    const ansiPattern = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g');
    const stripAnsi = (text: string) => text.replace(ansiPattern, '');

    expect(calls[0]).toBe('count: 3\n');
    expect(stripAnsi(calls[1]!)).toBe('{ a: 1 }\n');
  });

  it('leaves console.debug/dir/trace/table/group untouched -- only log/info/warn/error are patched', () => {
    const originalDebug = console.debug;
    const restore = patchConsole(() => {
      throw new Error('should never be called for console.debug');
    });

    try {
      expect(() => console.debug('untouched')).not.toThrow();
      expect(console.debug).toBe(originalDebug);
    } finally {
      restore();
    }
  });

  it('restores the original four methods once restore() is called', () => {
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;

    const restore = patchConsole(() => {});

    expect(console.log).not.toBe(originalLog);
    expect(console.info).not.toBe(originalInfo);
    expect(console.warn).not.toBe(originalWarn);
    expect(console.error).not.toBe(originalError);

    restore();

    expect(console.log).toBe(originalLog);
    expect(console.info).toBe(originalInfo);
    expect(console.warn).toBe(originalWarn);
    expect(console.error).toBe(originalError);
  });

  it('is idempotent -- calling restore() a second time does not clobber whatever patched console.log afterwards', () => {
    const originalLog = console.log;
    const restore = patchConsole(() => {});

    restore();
    expect(console.log).toBe(originalLog);

    // Something else (a second patch, e.g. a later `Container` instance)
    // takes over console.log after the first restore.
    const somethingElsesLog = () => {};
    console.log = somethingElsesLog;

    // A stray second call to the first restore -- must be a no-op, not
    // stomp over the second patch with its own stale snapshot.
    restore();

    expect(console.log).toBe(somethingElsesLog);

    console.log = originalLog;
  });
});
