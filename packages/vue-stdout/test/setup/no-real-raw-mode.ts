// Tripwire, not a convention (see `.agents/docs/testing.md`, "The raw-mode
// tripwire").
//
// `src/createApp.ts`'s `mount()` defaults `stdin` to the real
// `process.stdin`, and several existing tests (`test/render.test.ts`) pass it
// explicitly. That was harmless while nothing ever subscribed to input.
// `useInput` subscribes on mount, which means any test that renders a
// component using `useInput` -- without deliberately passing a fake stdin --
// would flip the developer's REAL terminal into raw mode. A test that then
// fails before it unmounts leaves the shell with no echo and no line
// editing until the process exits.
//
// Rather than trust every future test author to remember "always pass a fake
// stdin", this makes the real call itself impossible to perform silently:
// any invocation of a real stream's `setRawMode` -- from test code, from
// `InputSource`, from anywhere -- throws immediately with a message that
// names the problem and the fix. Tests must use
// `test/helpers/create-stdin.ts`'s `createStdin()` instead.
import tty from 'node:tty';

function guard(): never {
  throw new Error(
    "[no-real-raw-mode tripwire] a real stream's setRawMode() was called during a test run. " +
      'Tests must never put the real terminal into raw mode -- pass a fake stdin instead: ' +
      "import { createStdin } from 'test/helpers/create-stdin.ts' and hand its result to " +
      'app.mount()/new Container(...) as `stdin`. If you are seeing this from ' +
      '`mount()` defaulting `stdin` to `process.stdin`, pass an explicit fake stdin.',
  );
}

// Prototype-level: guards every `tty.ReadStream` instance, including one a
// test deliberately constructs itself (e.g. `new tty.ReadStream(0)`) to
// route around the more obvious `process.stdin` singleton below. Any
// instance without its own overriding property (the common case) inherits
// this guarded version instead of the real native binding.
Object.defineProperty(tty.ReadStream.prototype, 'setRawMode', {
  configurable: true,
  writable: true,
  value: guard,
});

// Instance-level: `process.stdin` isn't guaranteed to be a `tty.ReadStream`
// at all -- in a non-TTY environment (CI's typical `process.stdin`) it's a
// plain socket/file stream with no `setRawMode` on its prototype chain, so
// the patch above wouldn't reach it. Defined unconditionally, not gated on
// the method already existing, so the tripwire fires in that environment
// too, not only locally where a developer's real terminal happens to
// support raw mode.
Object.defineProperty(process.stdin, 'setRawMode', {
  configurable: true,
  writable: true,
  value: guard,
});
