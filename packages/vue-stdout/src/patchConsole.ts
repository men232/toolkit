/* eslint-disable no-console */
import { Console } from 'node:console';
import { PassThrough } from 'node:stream';

export type ConsoleStream = 'stdout' | 'stderr';
export type ConsoleWriter = (stream: ConsoleStream, data: string) => void;

/**
 * The methods this project intercepts -- a deliberate subset of what the
 * `patch-console` package patches (which also covers `dir`, `trace`,
 * `table`, `group*`, `count*`, `time*`, `assert`). Those others are
 * unimplemented here, not silently different.
 */
const patchedMethods = ['log', 'info', 'warn', 'error'] as const;

type PatchedMethod = (typeof patchedMethods)[number];

// `console.log`/`info`/`warn`/`error` are process-global, so this is one
// shared installation ref-counted by a stack of writers, not a per-caller
// snapshot-and-restore. The naive version corrupts the console permanently
// across two concurrent instances: A patches (snapshot = the real method), B
// patches while A lives (snapshot = A's wrapper), A restores first, silently
// discarding B's still-live interception, and B later restores A's wrapper,
// which closes over an already-destroyed `Container` -- leaving `console.log`
// wired to dead machinery for the rest of the process.
//
// The methods are patched once at first install and restored once at last
// uninstall; writers in between just push/remove themselves. Dispatch always
// goes to the topmost writer still on the stack, so an instance tearing down
// out of order simply drops out from underneath the ones still alive.
let originalMethods:
  Record<PatchedMethod, (typeof console)[PatchedMethod]> | undefined;
const writers: ConsoleWriter[] = [];

function dispatch(stream: ConsoleStream, data: string): void {
  writers.at(-1)?.(stream, data);
}

// Built once at module scope, routing via `dispatch` rather than to any one
// instance's writer, so the same pair of streams serves every installed
// writer for the life of the process.
const sharedStdout = new PassThrough();
const sharedStderr = new PassThrough();

// `write` is overridden rather than these being consumed as real streams:
// nothing needs to buffer or flow, only to hand what `Console` formatted
// straight to `dispatch`, synchronously, in the same call.
sharedStdout.write = ((chunk: unknown) => {
  dispatch('stdout', String(chunk));
  return true;
}) as typeof sharedStdout.write;
sharedStderr.write = ((chunk: unknown) => {
  dispatch('stderr', String(chunk));
  return true;
}) as typeof sharedStderr.write;

const sharedConsole = new Console(sharedStdout, sharedStderr);

function install(): void {
  // Already installed by an earlier writer, and the patched methods already
  // dispatch to whichever writer is topmost.
  if (originalMethods) return;

  originalMethods = {} as Record<
    PatchedMethod,
    (typeof console)[PatchedMethod]
  >;

  for (const method of patchedMethods) {
    originalMethods[method] = console[method];
    console[method] = sharedConsole[method].bind(sharedConsole);
  }
}

function uninstall(): void {
  if (!originalMethods) return;

  for (const method of patchedMethods) {
    console[method] = originalMethods[method];
  }

  originalMethods = undefined;
}

/**
 * Registers `onWrite` as a console interceptor and returns a function that
 * un-registers it again. `log`/`info`/`warn`/`error` route to `'stdout'`/
 * `'stderr'` respectively (matching the real global `console`'s own split),
 * formatted exactly the way Node's own `console` would (`util.format`-style
 * `%s`/`%d` substitution, object inspection, a trailing `\n`) -- via a real
 * `node:console` `Console`, rather than reimplementing that formatting by
 * hand.
 *
 * Deliberately **not** a wrapper around the `patch-console` package: this
 * project carries its own copy so that the caller
 * (`Container.writeConsoleOutput`) can erase and repaint the dynamic frame
 * around whatever `onWrite` receives, which needs knowledge of `frameHeight`
 * and `<Static>` that a third-party package has no way to have.
 *
 * Safe with any number of concurrent callers, in any removal order (see the
 * module comment above). Only the most recently registered writer receives
 * output; earlier ones are dormant, not gone, and resume once everything
 * above them is removed.
 *
 * The returned function is idempotent, so a crash path reaching it after a
 * clean one is a no-op rather than a second, wrong removal.
 */
export function patchConsole(onWrite: ConsoleWriter): () => void {
  writers.push(onWrite);
  install();

  let removed = false;

  return () => {
    if (removed) return;
    removed = true;

    const index = writers.lastIndexOf(onWrite);
    if (index !== -1) {
      writers.splice(index, 1);
    }

    if (writers.length === 0) {
      uninstall();
    }
  };
}
