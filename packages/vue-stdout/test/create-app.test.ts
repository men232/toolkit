// The point of `createApp()` is that the object it returns is *Vue's*, not a
// terminal-shaped imitation of it. That claim is invisible to every other
// test in this suite: `render()` mounted a tree and painted frames too, and
// every frame assertion in `test/**` would pass just as happily against an
// app object that quietly dropped `use`, `component`, `directive`, `provide`
// and `config` on the floor.
//
// So this file asserts the surface itself. Each test drives one Vue app
// feature all the way to the painted frame (or to the handler Vue is supposed
// to call), because "the method exists and returns `this`" is exactly the
// failure mode a hand-rolled facade would also pass.
import ansiEscapes from 'ansi-escapes';
import {
  defineComponent,
  h,
  inject,
  resolveComponent,
  resolveDirective,
  withDirectives,
} from 'vue';
import type { Directive, Plugin, VNodeChild } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/createApp';
import { useStdout } from '../src/hooks/useStdout';
import { createStdin } from './helpers/create-stdin';
import { createStdout } from './helpers/create-stdout';

const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

const box = (...kids: VNodeChild[]) => h('stdout-box', {}, kids);
const text = (value: string) => h('stdout-text', {}, value);

const countClears = (writes: string[]) =>
  writes.join('').split(ansiEscapes.clearTerminal).length - 1;

describe('the Vue app surface createApp() exposes', () => {
  it('app.use() runs the plugin against this very app object', async () => {
    const stdout = createStdout(30);
    const seen: unknown[] = [];

    // Registers through the `app` Vue hands it, not through a closure over
    // anything this test owns -- so a facade that passed some *other* object
    // to `install()` would register into a context the tree never reads.
    const plugin: Plugin<[string]> = {
      install(app, label) {
        seen.push(app);
        app.component(
          'PluginBadge',
          defineComponent({
            render: () => text(`plugin:${label}`),
          }),
        );
      },
    };

    const app = createApp({
      render: () => box(h(resolveComponent('PluginBadge'))),
    });

    // Chained, as a Vue user writes it: `use()` has to return something that
    // still has this package's `mount()` on it.
    app.use(plugin, 'installed').mount({ stdout });

    await flush();

    expect(seen).toEqual([app]);
    expect(stdout.get()).toContain('plugin:installed');

    app.unmount();
  });

  it('app.component() registers a global component the tree resolves by name', async () => {
    const stdout = createStdout(30);
    const app = createApp({
      render: () => box(h(resolveComponent('GlobalLabel'))),
    });

    app.component(
      'GlobalLabel',
      defineComponent({ render: () => text('global-label') }),
    );

    app.mount({ stdout });
    await flush();

    expect(stdout.get()).toContain('global-label');
    // Vue's own read-back overload, not a write: one name in, one component
    // out.
    expect(app.component('GlobalLabel')).toBeDefined();
    expect(app.component('NeverRegistered')).toBeUndefined();

    app.unmount();
  });

  it('app.directive() registers a global directive that runs against the host element', async () => {
    const stdout = createStdout(30);
    const mountedOn: unknown[] = [];

    const marker: Directive = {
      mounted(el) {
        mountedOn.push(el);
      },
    };

    const app = createApp({
      render: () =>
        box(withDirectives(text('directed'), [[resolveDirective('marker')!]])),
    });

    app.directive('marker', marker);
    app.mount({ stdout });
    await flush();

    // One call, and its argument is this package's own host node -- proof the
    // directive ran through the real renderer, not a stub.
    expect(mountedOn).toHaveLength(1);
    expect((mountedOn[0] as { tagName?: string }).tagName).toBe('stdout-text');
    expect(stdout.get()).toContain('directed');

    app.unmount();
  });

  it('app.provide() reaches a descendant inject()', async () => {
    const stdout = createStdout(30);

    const Child = defineComponent({
      setup() {
        const value = inject<string>('answer');
        return () => text(`answer:${value}`);
      },
    });

    const app = createApp({ render: () => box(h(Child)) });

    app.provide('answer', '42');
    app.mount({ stdout });
    await flush();

    expect(stdout.get()).toContain('answer:42');

    app.unmount();
  });

  it('app.config.globalProperties reaches the tree', async () => {
    const stdout = createStdout(30);

    const app = createApp(
      defineComponent({
        render() {
          return box(text(`global:${(this as { $brand: string }).$brand}`));
        },
      }),
    );

    app.config.globalProperties.$brand = 'vue-stdout';
    app.mount({ stdout });
    await flush();

    expect(stdout.get()).toContain('global:vue-stdout');

    app.unmount();
  });

  it('app.config.errorHandler catches a throw that would otherwise escape mount()', () => {
    const stdout = createStdout(20);
    const handler = vi.fn();

    const app = createApp({
      setup() {
        throw new Error('setup boom');
      },
      render: () => box(text('never painted')),
    });

    app.config.errorHandler = handler;

    // Without a handler this is exactly the case
    // `test/render.test.ts`'s "destroys the container instead of leaking it
    // when mounting throws" pins: Vue rethrows and `mount()` throws. With one
    // configured, Vue routes it instead -- which is the whole reason a
    // consumer wants `app.config` at all.
    expect(() => app.mount({ stdout })).not.toThrow();

    expect(handler).toHaveBeenCalledTimes(1);
    const [error, , info] = handler.mock.calls[0]!;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('setup boom');
    expect(info).toBe('setup function');

    app.unmount();
  });

  it('app.config.warnHandler intercepts Vue s own warnings', async () => {
    const stdout = createStdout(30);
    const warnings: string[] = [];

    const app = createApp({
      // An unresolved component is one of Vue's own dev warnings.
      render: () => box(h(resolveComponent('DefinitelyNotRegistered'))),
    });

    app.config.warnHandler = message => {
      warnings.push(message);
    };

    app.mount({ stdout });
    await flush();

    expect(warnings.join('\n')).toContain('DefinitelyNotRegistered');

    app.unmount();
  });

  it('mount() returns the root component instance, as Vue s own mount does', () => {
    const stdout = createStdout(20);
    const app = createApp(
      defineComponent({
        setup() {
          return { answer: 42 };
        },
        render: () => box(text('root')),
      }),
    );

    const root = app.mount({ stdout });

    expect((root as unknown as { answer: number }).answer).toBe(42);
    expect(root.$el).toBeDefined();

    app.unmount();
  });

  it('createApp(component, rootProps) passes the props through', async () => {
    const stdout = createStdout(30);
    const app = createApp(
      defineComponent({
        props: { label: { type: String, required: true } },
        render() {
          return box(text(`prop:${this.label}`));
        },
      }),
      { label: 'from-root-props' },
    );

    app.mount({ stdout });
    await flush();

    expect(stdout.get()).toContain('prop:from-root-props');

    app.unmount();
  });
});

// The invariant these pin: `exitPromise` belongs to the *app*, is created in
// `createApp()`, and settles at most once. See the lifetime note in
// `src/createApp.ts`.
describe('the exit promise s lifetime', () => {
  it('waitUntilExit() is valid before mount, and stays pending across it', async () => {
    const stdout = createStdout(20);
    const app = createApp({ render: () => box(text('x')) });

    const settled = vi.fn();
    // Subscribed before anything has been mounted at all.
    app.waitUntilExit().then(settled, settled);

    await flush();
    expect(settled).not.toHaveBeenCalled();

    app.mount({ stdout });
    await flush();
    expect(settled).not.toHaveBeenCalled();

    app.unmount();
    await expect(app.waitUntilExit()).resolves.toBeUndefined();
    expect(settled).toHaveBeenCalledTimes(1);
  });

  it('hands out the same promise every call', () => {
    const app = createApp({ render: () => box(text('x')) });

    expect(app.waitUntilExit()).toBe(app.waitUntilExit());

    app.unmount();
  });

  it('unmount() before mount settles the exit without warning about an unmounted app', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const app = createApp({ render: () => box(text('x')) });

      expect(() => app.unmount()).not.toThrow();
      await expect(app.waitUntilExit()).resolves.toBeUndefined();

      // Vue's own `unmount()` warns when the app was never mounted. Nothing
      // was, so this must never have reached Vue's unmount at all.
      expect(
        warn.mock.calls.flat().join(' '),
      ).not.toContain('not mounted');
    } finally {
      warn.mockRestore();
    }
  });

  it('settles once: a second exit path after the first cannot re-settle it', async () => {
    const stdout = createStdout(20);
    const app = createApp({ render: () => box(text('x')) });
    app.mount({ stdout });

    await flush();

    const exited = app.waitUntilExit();
    app.unmount();
    // Whichever runs first wins; the rest are no-ops (shared `exitRequested`
    // latch). A second settle attempt on an already-resolved promise would be
    // invisible here, so this also asserts teardown did not run twice --
    // `Container#destroy()` a second time would double-free Yoga's nodes.
    expect(() => app.unmount()).not.toThrow();

    await expect(exited).resolves.toBeUndefined();
  });
});

describe('one live app per output stream', () => {
  it('refuses a second app on a stdout that already has a live one', async () => {
    const stdout = createStdout(20);

    const first = createApp({ render: () => box(text('first')) });
    first.mount({ stdout });
    await flush();

    const second = createApp({ render: () => box(text('second')) });

    expect(() => second.mount({ stdout })).toThrow(/already has a live/);

    // The rejected mount wired nothing, so it must not have evicted the owner
    // it collided with, nor torn anything of the owner's down.
    expect(stdout.listenerCount('resize')).toBe(1);
    expect(stdout.get()).toContain('first');

    first.unmount();
    expect(stdout.listenerCount('resize')).toBe(0);
  });

  it('frees the stream again once the first app unmounts', async () => {
    const stdout = createStdout(20);

    const first = createApp({ render: () => box(text('first')) });
    first.mount({ stdout });
    await flush();
    first.unmount();

    const second = createApp({ render: () => box(text('second')) });

    expect(() => second.mount({ stdout })).not.toThrow();

    await flush();
    expect(stdout.get()).toContain('second');

    second.unmount();
  });

  it('leaves the stream free when a mount throws', () => {
    const stdout = createStdout(20);

    const thrower = createApp({
      setup() {
        throw new Error('boom');
      },
      render: () => box(text('x')),
    });

    expect(() => thrower.mount({ stdout })).toThrow('boom');

    // The failed mount's `catch` releases everything it took, the registry
    // entry included -- otherwise one bad mount would poison `process.stdout`
    // for the rest of the process.
    const next = createApp({ render: () => box(text('next')) });
    expect(() => next.mount({ stdout })).not.toThrow();

    next.unmount();
  });

  it('lets two apps run side by side on different streams', async () => {
    const stdoutA = createStdout(20);
    const stdoutB = createStdout(20);

    const appA = createApp({ render: () => box(text('a-side')) });
    const appB = createApp({ render: () => box(text('b-side')) });

    appA.mount({ stdout: stdoutA, stdin: createStdin() });
    appB.mount({ stdout: stdoutB, stdin: createStdin() });

    await flush();

    expect(stdoutA.get()).toContain('a-side');
    expect(stdoutB.get()).toContain('b-side');

    appA.unmount();
    appB.unmount();
  });
});

describe('one mount per app', () => {
  it('mount() throws when the app is already mounted', async () => {
    const stdout = createStdout(20);
    const app = createApp({ render: () => box(text('x')) });

    app.mount({ stdout });
    await flush();

    expect(() => app.mount({ stdout: createStdout(20) })).toThrow(
      /already mounted/,
    );

    app.unmount();
  });
});

describe('useStdout().clear()', () => {
  it('erases the terminal from inside the tree', async () => {
    const stdout = createStdout(20);
    let clear!: () => void;

    const app = createApp({
      setup() {
        clear = useStdout().clear;
        return () => box(text('frame'));
      },
    });

    app.mount({ stdout });
    await flush();

    // `Container`'s constructor already writes one `clearTerminal` in
    // interactive mode, so this counts rather than merely containing.
    const clearsBefore = countClears(stdout.getWrites());

    clear();

    expect(countClears(stdout.getWrites())).toBe(clearsBefore + 1);

    app.unmount();
  });

  it('is a no-op in non-interactive mode, where there is nothing painted to erase', async () => {
    const stdout = createStdout(20, false);
    let clear!: () => void;

    const app = createApp({
      setup() {
        clear = useStdout().clear;
        return () => box(text('frame'));
      },
    });

    app.mount({ stdout, interactive: false });
    await flush();

    clear();

    expect(countClears(stdout.getWrites())).toBe(0);

    app.unmount();
  });
});
