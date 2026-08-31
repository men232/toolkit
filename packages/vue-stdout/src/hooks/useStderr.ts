import { useStderrContext } from '../context';

export interface UseStderrResult {
  /** The stderr stream, or `process.stderr` by default. */
  readonly stderr: NodeJS.WriteStream;
  /** Write a string straight to `stderr`, bypassing the component tree. */
  readonly write: (data: string) => void;
}

/**
 * Returns the stderr stream. Matches ink's `useStderr` shape. Must be called
 * from a component mounted via `createApp().mount()`.
 */
export function useStderr(): UseStderrResult {
  return useStderrContext();
}
