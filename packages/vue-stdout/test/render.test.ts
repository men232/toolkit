import { h, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createStdout } from './helpers/create-stdout';
import { createApp } from '../src/createApp';
import { Container } from '../src/Container';
import { DOM } from '../src/tree';

const box = (props: any, ...kids: any[]) => h('stdout-box', props, kids);
const span = (props: any, ...kids: any[]) => h('stdout-text', props, kids);

const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

describe('render', () => {
  it('writes a frame to stdout', async () => {
    const stdout = createStdout(20);
    const app = createApp({ render: () => box({}, span({}, 'hello')) });
    app.mount({ stdout });

    await flush();

    expect(stdout.get()).toContain('hello');
    app.unmount();
  });

  it('re-renders on reactive change', async () => {
    const stdout = createStdout(20);
    const label = ref('first');
    // `maxFps: 0` (unlimited): this test asserts on the
    // frame right after the reactive change settles, with no real time
    // elapsed -- the default `maxFps: 30` throttle would otherwise coalesce
    // that write away and leave the stale "first" frame on screen.
    const app = createApp({ render: () => box({}, span({}, label.value)) });
    app.mount({ stdout, maxFps: 0 });

    await flush();
    expect(stdout.get()).toContain('first');

    label.value = 'second';
    await nextTick();
    await flush();

    expect(stdout.get()).toContain('second');
    app.unmount();
  });

  it('resolves waitUntilExit after unmount', async () => {
    const stdout = createStdout(20);
    const app = createApp({ render: () => box({}, span({}, 'x')) });
    app.mount({ stdout });

    await flush();

    const exited = app.waitUntilExit();
    app.unmount();

    await expect(exited).resolves.toBeUndefined();
  });

  it('accepts a bare stream as the second argument', async () => {
    const stdout = createStdout(20);
    const app = createApp({ render: () => box({}, span({}, 'bare')) });
    app.mount(stdout);

    await flush();

    expect(stdout.get()).toContain('bare');
    app.unmount();
  });

  it('removes the stdout resize listener after unmount', async () => {
    const stdout = createStdout(20);
    const app = createApp({ render: () => box({}, span({}, 'x')) });
    app.mount({ stdout });

    await flush();
    expect(stdout.listenerCount('resize')).toBeGreaterThan(0);

    app.unmount();

    expect(stdout.listenerCount('resize')).toBe(0);
  });

  it('removes shrunk list content from the rendered frame', async () => {
    const stdout = createStdout(20);
    const items = ref(['first', 'second', 'third']);
    // `maxFps: 0` -- see the "re-renders on reactive change" test just above.
    const app = createApp({
      render: () =>
        box(
          {},
          items.value.map(item => span({ key: item }, item)),
        ),
    });
    app.mount({ stdout, maxFps: 0 });

    await flush();
    expect(stdout.get()).toContain('third');

    items.value = items.value.slice(0, 2);
    await nextTick();
    await flush();

    expect(stdout.get()).not.toContain('third');
    expect(stdout.get()).toContain('first');
    expect(stdout.get()).toContain('second');

    app.unmount();
  });

  it('survives unmount in the same tick a frame was queued in', async () => {
    const stdout = createStdout(20);

    // Deliberately no `await flush()` between these two lines. `render()`
    // queues a frame on the next tick; `unmount()` frees the tree's Yoga
    // nodes -- WASM memory -- synchronously, in this tick, so the queued
    // callback runs against a torn-down tree.
    //
    // This is the end-to-end smoke test for that path. It cannot fail loudly
    // on its own -- see the `Renderer` test below, which pins the actual
    // guard.
    const app = createApp({ render: () => box({}, span({}, 'x')) });
    app.mount({ stdout });

    app.unmount();

    const writesAtUnmount = stdout.getWrites().length;

    // One tick for the queued frame to fire (or not), one more to observe.
    await flush();
    await flush();

    expect(stdout.getWrites().length).toBe(writesAtUnmount);
  });

  it('destroys the container instead of leaking it when mounting throws', () => {
    // A `setup()` that throws makes `app.mount()` throw synchronously (no
    // `errorHandler` configured, so Vue rethrows). Before the fix, `render()`
    // had no try/finally around `app.mount()`: the `Container` already
    // allocated a Yoga node and subscribed to `stdout`'s `resize` event by
    // this point, and neither was ever cleaned up.
    const stdout = createStdout(20);

    expect(() =>
      createApp({
        setup() {
          throw new Error('boom');
        },
        render: () => box({}, span({}, 'x')),
      }).mount({ stdout }),
    ).toThrow('boom');

    expect(stdout.listenerCount('resize')).toBe(0);
  });

  // Was "rerender() throws once the app has been unmounted". `rerender()` is
  // gone -- replacing the root from outside is an ink-ism, and in Vue you
  // change data or mount a new app -- but the assertion it was really making
  // survives: an app past its exit rejects further use rather than quietly
  // half-working.
  it('mount() throws once the app has been unmounted', async () => {
    const stdout = createStdout(20);
    const app = createApp({ render: () => box({}, span({}, 'x')) });
    app.mount({ stdout });

    await flush();
    app.unmount();

    expect(() => app.mount({ stdout: createStdout(20) })).toThrow(
      /already exited/,
    );
  });
});

describe('Container#destroy', () => {
  it('drops the DOMChanged listener so a mutation after destroy schedules no further writes', async () => {
    const stdout = createStdout(20);
    const container = new Container({
      debug: false,
      exitOnCtrlC: true,
      interactive: true,
      stdin: process.stdin,
      stdout,
      stderr: process.stderr,
    });

    const el = DOM.Document.createElement('stdout-box');
    container.appendChild(el);
    await flush();

    const writesBeforeDestroy = stdout.getWrites().length;

    container.destroy();

    expect(container.listenerCount('DOMChanged')).toBe(0);

    // Mutate a node nested under the container -- the path a real component
    // update takes. Before the fix, the renderer's 'DOMChanged' listener was
    // never removed, so this still scheduled a frame even though nothing
    // was left listening for it.
    el.appendChild(DOM.Document.createTextNode('after destroy'));
    await flush();

    expect(stdout.getWrites().length).toBe(writesBeforeDestroy);
  });

  it('does not run a layout queued before destroy', async () => {
    const stdout = createStdout(20);
    const container = new Container({
      debug: false,
      exitOnCtrlC: true,
      interactive: true,
      stdin: process.stdin,
      stdout,
      stderr: process.stderr,
    });

    // Queue a frame, then tear down in the same tick -- the shape
    // `Instance#unmount` produces.
    container.appendChild(DOM.Document.createElement('stdout-box'));

    const renderSpy = vi.spyOn(container.renderer, 'render');

    container.destroy();

    await flush();

    // The scheduler must consult `destroyed` from *inside* its nextTick
    // callback. Checking it only at scheduling time lets this run over a tree
    // whose Yoga nodes `destroy()` has already freed.
    expect(renderSpy).not.toHaveBeenCalled();
  });

  it('is idempotent and safe when no layout has ever run', () => {
    const stdout = createStdout(20);
    const container = new Container({
      debug: false,
      exitOnCtrlC: true,
      interactive: true,
      stdin: process.stdin,
      stdout,
      stderr: process.stderr,
    });

    // Deliberately NOT flushing first: the constructor schedules a frame, so
    // this tears down with that frame still queued. The scheduler's
    // `destroyed` flag is checked inside the callback, so it never runs.
    expect(() => container.destroy()).not.toThrow();
    // Calling destroy() again must not double-free the render tree's
    // already-freed Yoga nodes.
    expect(() => container.destroy()).not.toThrow();
  });
});
