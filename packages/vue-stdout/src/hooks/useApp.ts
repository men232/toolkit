// Ported from ink's `src/hooks/use-app.ts` / `src/components/AppContext.ts`,
// pared down to the one method this project implements: `exit()`. ink's
// `waitUntilRenderFlush`/`suspendTerminal` are outside this project's scope
// and left out rather than stubbed.
import { useAppContext } from '../context';

export interface UseAppResult {
  /**
   * Exit (unmount) the app -- the same teardown path as `app.unmount()`
   * (raw mode released, listeners removed, `Container.destroy()` run).
   *
   * - `exit()` -- resolves `waitUntilExit()`.
   * - `exit(error)` -- rejects `waitUntilExit()` with `error`.
   *
   * Calling `exit()` more than once, or alongside `app.unmount()`, is
   * safe: only the first call settles `waitUntilExit()` or runs teardown.
   */
  readonly exit: (error?: Error) => void;
}

/**
 * Returns app lifecycle methods. Matches ink's `useApp` shape (its `exit`
 * method only). Must be called from a component mounted via `createApp().mount()`.
 */
export function useApp(): UseAppResult {
  const { exit } = useAppContext();
  return { exit };
}
