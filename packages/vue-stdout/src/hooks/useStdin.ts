import { useStdinContext } from '../context';

export interface UseStdinResult {
  /** The stdin stream passed to `mount()`, or `process.stdin` by default. */
  readonly stdin: NodeJS.ReadStream;
  /**
   * Puts `stdin` into (or out of) raw mode. Use this instead of calling
   * `stdin.setRawMode` directly -- raw mode is reference-counted across every
   * `useInput` hook mounted at once (see `src/input/InputSource.ts`), and
   * calling the real stream method yourself would desync that count.
   */
  readonly setRawMode: (value: boolean) => void;
  /**
   * Whether the current `stdin` can actually be put into raw mode. A
   * component using `setRawMode` directly may want to check this first to
   * fall back gracefully in environments (e.g. piped input, non-TTY) where
   * raw mode isn't supported.
   */
  readonly isRawModeSupported: boolean;
}

/**
 * Returns the stdin stream and stdin-related utilities. Matches ink's
 * `useStdin` shape. Must be called from a component mounted via `createApp().mount()`.
 */
export function useStdin(): UseStdinResult {
  const { stdin, setRawMode, isRawModeSupported } = useStdinContext();
  return { stdin, setRawMode, isRawModeSupported };
}
