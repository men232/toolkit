import EventEmitter from 'node:events';
import { vi } from 'vitest';

export type FakeStdout = NodeJS.WriteStream & {
  get: () => string;
  getWrites: () => string[];
};

export function createStdout(columns?: number, isTTY?: boolean): FakeStdout {
  const stdout = new EventEmitter() as unknown as FakeStdout;

  stdout.columns = columns ?? 100;
  stdout.rows = 20;
  stdout.isTTY = isTTY ?? true;

  const write = vi.fn((...args: unknown[]) => {
    const callback = args.at(-1);
    if (typeof callback === 'function') {
      queueMicrotask(callback as () => void);
    }
    return true;
  });

  stdout.write = write as unknown as FakeStdout['write'];

  // `src/Container.ts` drives the cursor directly (via `ansi-escapes`).
  stdout.cursorTo = vi.fn(() => true) as unknown as FakeStdout['cursorTo'];
  stdout.clearLine = vi.fn(() => true) as unknown as FakeStdout['clearLine'];

  const writes = () => write.mock.calls.map(args => args[0] as string);

  stdout.get = () => writes().findLast(text => text?.length > 0) ?? '';
  stdout.getWrites = writes;

  return stdout;
}
