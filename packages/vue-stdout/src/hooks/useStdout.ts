import { useStdoutContext } from '../context';

export interface UseStdoutResult {
  /** The stdout stream where the app renders, or `process.stdout` by default. */
  readonly stdout: NodeJS.WriteStream;
  /**
   * Write a string straight to `stdout`, bypassing the component tree. Useful
   * for printing something once, outside of the app's own frame.
   */
  readonly write: (data: string) => void;
  /**
   * Erase the terminal and forget what is on it, so the next frame paints
   * onto a blank screen rather than diffing against the old one. Also drops
   * any `<Static>` output that had scrolled above the frame -- that content
   * is gone from the terminal, so keeping it in the bookkeeping would leave
   * the next repaint describing a screen that no longer exists.
   *
   * A no-op in non-interactive mode and under `debug`, matching ink: neither
   * mode has a repainted screen to erase, so the escape sequence would be
   * exactly the stray ANSI noise they exist to avoid.
   */
  readonly clear: () => void;
}

/**
 * Returns the stdout stream where the app renders. Matches ink's `useStdout`
 * shape, plus `clear()`. Must be called from a component mounted via
 * `createApp().mount()`.
 *
 * `clear()` lives here rather than on the app object for two reasons. It
 * needs the live `Container`, which exists only between `mount()` and
 * teardown -- on the app it would be a method that silently did nothing
 * before mount and after unmount, which is exactly the lifetime confusion
 * this API stopped inheriting from ink. And it is a write to the app's own
 * output stream, which is what this hook already is: `stdout`, `write`,
 * `clear`.
 */
export function useStdout(): UseStdoutResult {
  return useStdoutContext();
}
