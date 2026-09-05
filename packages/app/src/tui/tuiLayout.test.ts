import { createApp } from '@andrew_l/vue-stdout';
import EventEmitter from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import TuiRoot from './components/TuiRoot.vue';
import { createTuiStore } from './store.ts';
import type { LifecycleHandlers } from './types.ts';

const noopHandlers: LifecycleHandlers = {
  stop: () => Promise.resolve(),
  start: () => Promise.resolve(),
  restart: () => Promise.resolve(),
};

function createStdout(columns: number, rows: number) {
  const stdout = new EventEmitter() as any;
  stdout.columns = columns;
  stdout.rows = rows;
  stdout.isTTY = true;
  const write = vi.fn((_chunk: string) => true);
  stdout.write = write;
  stdout.getWrites = (): string[] => write.mock.calls.map(args => args[0]);
  return stdout;
}

function createStdin() {
  const stdin = new EventEmitter() as any;
  stdin.isTTY = true;
  stdin.setRawMode = vi.fn();
  stdin.setEncoding = () => stdin;
  stdin.read = vi.fn();
  stdin.ref = () => stdin;
  stdin.unref = () => stdin;
  return stdin;
}

const flush = (): Promise<void> =>
  new Promise<void>(resolve => process.nextTick(resolve));

/**
 * Renders the TUI shell in a terminal of `rows` and returns the frame's lines.
 *
 * `entryCount` log lines are pushed at `entryWidth` characters each, so a test
 * can make the log panel's content overflow the space the shell leaves it --
 * which is what long, wrapping log lines do in a real run.
 */
function renderShell({
  rows,
  columns,
  entryCount,
  entryWidth,
}: {
  rows: number;
  columns: number;
  entryCount: number;
  entryWidth: number;
}): Promise<string[]> {
  const stdout = createStdout(columns, rows);
  const store = createTuiStore(noopHandlers);

  const app = store.addApp({
    kind: 'app',
    id: 'app#0',
    name: 'demo',
    state: 'run',
    expanded: false,
    threads: null,
  });

  for (let i = 0; i < entryCount; i++) {
    store.pushLog(app.id, {
      ts: 0,
      level: 'info',
      text: 'x'.repeat(entryWidth),
    });
  }

  const tui = createApp(TuiRoot, {
    store,
    onExit: () => Promise.resolve(),
  });

  tui.mount({
    stdout,
    stdin: createStdin(),
    maxFps: 0,
    patchConsole: false,
    exitOnCtrlC: false,
  });

  return flush().then(() => {
    const frame = stdout
      .getWrites()
      .findLast((w: string) => w.includes('─')) as string | undefined;
    tui.unmount();
    return frame ? frame.split('\n') : [];
  });
}

/** Like `renderShell`, but each entry is tagged so it can be located. */
function renderShellTagged(opts: {
  rows: number;
  columns: number;
  entryCount: number;
  entryWidth: number;
}): Promise<string[]> {
  const stdout = createStdout(opts.columns, opts.rows);
  const store = createTuiStore(noopHandlers);
  const app = store.addApp({
    kind: 'app',
    id: 'app#0',
    name: 'demo',
    state: 'run',
    expanded: false,
    threads: null,
  });
  for (let i = 0; i < opts.entryCount; i++) {
    store.pushLog(app.id, {
      ts: 0,
      level: 'info',
      text: `E${i}-` + 'x'.repeat(opts.entryWidth),
    });
  }
  const tui = createApp(TuiRoot, { store, onExit: () => Promise.resolve() });
  tui.mount({
    stdout,
    stdin: createStdin(),
    maxFps: 0,
    patchConsole: false,
    exitOnCtrlC: false,
  });
  return flush().then(() => {
    const frame = stdout
      .getWrites()
      .findLast((w: string) => w.includes('─')) as string | undefined;
    tui.unmount();
    return frame ? frame.split('\n') : [];
  });
}

describe('TUI shell layout', () => {
  it('keeps the status bar on screen when the log fits', async () => {
    const lines = await renderShell({
      rows: 14,
      columns: 60,
      entryCount: 2,
      entryWidth: 10,
    });

    expect(lines).toHaveLength(14);
    expect(lines.some(l => l.includes('↑/↓'))).toBe(true);
  });

  // The log panel must be what gets clipped when there is not enough room --
  // never the status bar. Long log lines wrap, so a feed sliced to the row
  // count still overflows, and an unshrinkable row pushed the status bar out
  // of the frame entirely.
  it('keeps the status bar on screen when the log overflows', async () => {
    const lines = await renderShell({
      rows: 14,
      columns: 60,
      entryCount: 12,
      entryWidth: 200,
    });

    expect(lines).toHaveLength(14);
    expect(lines.some(l => l.includes('↑/↓'))).toBe(true);
  });
});

describe('TUI log panel alignment', () => {
  // The feed fills from the top, the way it always has. It can only do that
  // without clipping because `useLogFeed` budgets by rows rather than entries;
  // bottom-anchoring the panel would be the other way to stop a wrapped entry
  // overrunning it, at the cost of this.
  it('starts the feed at the top of the panel', async () => {
    const lines = await renderShellTagged({
      rows: 14,
      columns: 60,
      entryCount: 2,
      entryWidth: 10,
    });

    // Row 0 is the panel's top border, row 1 the header, so the first entry
    // belongs on row 2 -- not pushed to the bottom by empty space above it.
    expect(lines[2]).toContain('E0-');
    expect(lines[3]).toContain('E1-');
  });

  // Restores what the SFC compiler dropped: a whitespace-only text node at an
  // element's edge is deleted, so `{{ time }} ` rendered as `16:16:54INFO`.
  it('keeps a space between the timestamp and the level', async () => {
    const lines = await renderShellTagged({
      rows: 14,
      columns: 60,
      entryCount: 1,
      entryWidth: 10,
    });

    expect(lines[2]).toMatch(/\d\d:\d\d:\d\d INFO/);
  });
});

describe('TUI log panel clipping direction', () => {
  // A log tail that hides its newest line is showing the wrong half. When
  // wrapped entries overrun the panel, the oldest must fall off the top.
  it('shows the newest entries when the feed overflows', async () => {
    const lines = await renderShellTagged({
      rows: 14,
      columns: 60,
      entryCount: 10,
      entryWidth: 120,
    });
    const frame = lines.join('\n');

    expect(frame).toContain('E9-');
    expect(frame).not.toContain('E0-');
    expect(lines.some(l => l.includes('↑/↓'))).toBe(true);
  });
});
