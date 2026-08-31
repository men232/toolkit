/**
 * Adapted from @vue-tui/vite -- `wrapServerClose` in
 * `packages/vite/src/dev.ts`.
 *
 * MIT License. Copyright (c) 2026 Yunfei He.
 * Full notice: `packages/vue-stdout/THIRD-PARTY-NOTICES.md`.
 *
 * Changes from the original: none of substance -- renamed to its own module
 * and re-commented.
 */
import type { ViteDevServer } from 'vite';

/**
 * Run `onClose` before Vite's own `server.close()`, whichever of the two
 * initiated it -- a programmatic call, Ctrl-C, or the app asking the server to
 * close because it exited.
 *
 * Both failures are reported, and that is the whole reason this is not three
 * lines: swallowing the teardown error to let the close through would hide the
 * app failing to restore the terminal, and rethrowing it before closing would
 * leave Vite's ports and watchers open. So both run, and an `AggregateError`
 * carries them out together when both fail.
 */
export function wrapServerClose(
  server: ViteDevServer,
  onClose: () => void | Promise<void>,
): void {
  const originalClose = server.close.bind(server);

  server.close = (async () => {
    let teardownFailed = false;
    let teardownError: unknown;

    try {
      await onClose();
    } catch (error) {
      teardownFailed = true;
      teardownError = error;
    }

    try {
      await originalClose();
    } catch (closeError) {
      if (teardownFailed) {
        throw new AggregateError(
          [teardownError, closeError],
          'Failed to tear down both the vue-stdout app and the Vite dev server.',
        );
      }
      throw closeError;
    }

    if (teardownFailed) throw teardownError;
  }) as typeof server.close;
}
