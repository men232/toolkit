import { defineComponent, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { Box, Text, createApp, useWindowSize } from '../src';
import { createStdout } from './helpers/create-stdout';

const tick = (): Promise<void> =>
  new Promise<void>(resolve => process.nextTick(resolve));

/** A macrotask, which is where a real `'resize'` (SIGWINCH) is delivered. */
const macrotask = (): Promise<void> =>
  new Promise<void>(resolve => setTimeout(resolve, 0));

const stripAnsi = (text: string): string =>
   
  text.replace(/\[[0-9;?]*[A-Za-z]/g, '');

/** Every frame write's widest line and line count. */
function framesIn(writes: string[]): { lines: number; width: number }[] {
  return writes
    .filter(write => write.includes('─'))
    .map(write => {
      const lines = stripAnsi(write).split('\n');
      return {
        lines: lines.length,
        width: Math.max(...lines.map(line => [...line].length)),
      };
    });
}

/**
 * A component that sizes itself from `useWindowSize()` -- the documented way to
 * compute from the terminal's dimensions, and what a full-screen TUI does.
 */
function pinnedShell(body: { value: string }) {
  return defineComponent(() => {
    const { columns, rows } = useWindowSize();

    return () => (
      <Box flexDirection="column" width={columns.value} height={rows.value}>
        <Box flexGrow={1} borderStyle="single">
          <Text>{body.value}</Text>
        </Box>
      </Box>
    );
  });
}

describe('a resize must not paint a frame at the previous size', () => {
  it('never writes a frame wider or taller than the terminal', async () => {
    const stdout = createStdout(70);
    stdout.rows = 20;

    const body = ref('first');
    const app = createApp(pinnedShell(body));
    app.mount({ stdout, maxFps: 0, patchConsole: false });
    await tick();

    const before = stdout.getWrites().length;

    // The resize is delivered from a real macrotask, which is where a SIGWINCH
    // lands -- and that is load-bearing. Node drains the `process.nextTick`
    // queue (where the renderer schedules its frame) before the promise
    // microtask queue (where Vue schedules its re-render), so a resize handled
    // from a macrotask paints before the app has reacted to the new size.
    await new Promise<void>(resolve =>
      setTimeout(() => {
        body.value = 'second';
        stdout.columns = 50;
        stdout.rows = 12;
        stdout.emit('resize');
        resolve();
      }, 0),
    );

    for (let i = 0; i < 8; i++) await tick();

    const frames = framesIn(stdout.getWrites().slice(before));
    const detail = `frames written after the resize: ${JSON.stringify(frames)}`;

    // A frame at the previous size is the defect: every line of a 70-column
    // frame wraps in a 50-column terminal, so it covers more physical rows than
    // the logical lines the next erase is measured in, and the remnant is
    // stranded above the app until something clears the terminal.
    expect(
      frames.filter(frame => frame.width > 50 || frame.lines > 12),
      detail,
    ).toEqual([]);

    // Exactly one repaint, not the deferred frame plus the consumer's own --
    // two identical full repaints of the whole screen. See `Container`'s
    // `deferUntilResizedLayout`.
    expect(frames, detail).toHaveLength(1);

    app.unmount();
  });
});
