import EventEmitter from 'node:events';
import { type Mock, vi } from 'vitest';

// Each mock names the signature it stands in for, rather than the shorter
// `ReturnType<typeof vi.fn>`. That idiom instantiates `vi.fn`'s type parameter
// at its *constraint*, which vitest 4 widened from `Procedure` to
// `Procedure | Constructable` -- a union with no single call signature, so the
// mock stopped being assignable to the `NodeJS.ReadStream` member it overrides.
export type FakeStdin = NodeJS.ReadStream & {
  setRawMode?: Mock<(mode: boolean) => FakeStdin>;
  read: Mock<(size?: number) => any>;
};

/**
 * `isTTY` defaults to `true` -- an interactive terminal, same as every
 * existing caller of this helper expects. Pass `false` to simulate piped/
 * redirected stdin (`cat data | myapp`): a real non-TTY `process.stdin` is a
 * plain `net.Socket`/`fs.ReadStream`, neither of which even has a
 * `setRawMode` method (unlike `tty.ReadStream`) -- so, matching that, this
 * omits it too rather than merely toggling `isTTY` while still exposing a
 * working `setRawMode`. See `src/input/InputSource.ts`'s `isRawModeSupported`
 * getter, which tests `isTTY` (matching ink), not whether `setRawMode`
 * happens to exist.
 */
export function createStdin(isTTY = true): FakeStdin {
  const stdin = new EventEmitter() as unknown as FakeStdin;

  stdin.isTTY = isTTY;
  if (isTTY) {
    stdin.setRawMode = vi.fn<(mode: boolean) => FakeStdin>();
  }

  stdin.setEncoding = () => stdin;
  stdin.read = vi.fn<(size?: number) => any>();
  stdin.ref = () => stdin;
  stdin.unref = () => stdin;

  return stdin;
}

export function emitReadable(stdin: FakeStdin, chunk: string): void {
  stdin.read.mockReturnValueOnce(chunk).mockReturnValueOnce(null);
  stdin.emit('readable');
  stdin.read.mockReset();
}
