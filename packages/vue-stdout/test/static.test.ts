import { h, nextTick, ref, watch } from 'vue';
import { describe, expect, it } from 'vitest';
import { createStdout } from './helpers/create-stdout';
import { createApp } from '../src/createApp';
import { Static } from '../src/components/Static';

const box = (props: any, ...kids: any[]) => h('stdout-box', props, kids);
const span = (props: any, ...kids: any[]) => h('stdout-text', props, kids);

const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

describe('Static', () => {
  it('prints each item once, and never reprints it on a later render', async () => {
    const stdout = createStdout(40);
    const items = ref(['first']);
    // Unrelated reactive value: forces extra frames without touching
    // `items`, so this can assert that a render with nothing new to flush
    // does not reprint what an earlier render already wrote.
    const tick = ref(0);

    const countWritesContaining = (needle: string) =>
      stdout.getWrites().filter(text => text.includes(needle)).length;

    const app = createApp({
      render: () =>
        box(
          {},
          h(
            Static,
            { items: items.value },
            {
              default: ({ item }: { item: string }) =>
                span({ key: item }, item),
            },
          ),
          span({}, `tick:${tick.value}`),
        ),
    });
    app.mount({ stdout });

    await flush();
    expect(countWritesContaining('first')).toBe(1);

    // Two more frames, neither touching `items`.
    tick.value = 1;
    await nextTick();
    await flush();
    expect(countWritesContaining('first')).toBe(1);

    tick.value = 2;
    await nextTick();
    await flush();
    expect(countWritesContaining('first')).toBe(1);

    // A genuinely new item is still printed -- exactly once -- without
    // touching the count for the item already flushed.
    items.value = [...items.value, 'second'];
    await nextTick();
    await flush();

    expect(countWritesContaining('first')).toBe(1);
    expect(countWritesContaining('second')).toBe(1);

    app.unmount();
  });

  it('still prints new items after items shrinks and then grows past the old length', async () => {
    const stdout = createStdout(40);
    const items = ref(['a', 'b', 'c']);

    const countWritesContaining = (needle: string) =>
      stdout.getWrites().filter(text => text.includes(needle)).length;

    const app = createApp({
      render: () =>
        box(
          {},
          h(
            Static,
            { items: items.value },
            {
              default: ({ item }: { item: string }) =>
                span({ key: item }, item),
            },
          ),
        ),
    });
    app.mount({ stdout });

    await flush();
    expect(countWritesContaining('a')).toBe(1);
    expect(countWritesContaining('b')).toBe(1);
    expect(countWritesContaining('c')).toBe(1);

    // Shrink: 'b' and 'c' are removed upstream (a filter, a splice, a
    // reset) -- the flushed count (3) is now ahead of how many children the
    // box actually has (1).
    items.value = ['a'];
    await nextTick();
    await flush();

    // Grow again, past the old high-water mark, with a genuinely new item.
    // Before clamping the flushed count down on shrink, `flushed` stayed at
    // 3 forever, so `childNodes.slice(3)` on this 2-child box came back
    // empty and 'd' was never printed -- not now, not on any later render.
    items.value = ['a', 'd'];
    await nextTick();
    await flush();

    expect(countWritesContaining('d')).toBe(1);

    app.unmount();
  });

  it('is excluded from the ordinarily-repainted frame', async () => {
    const stdout = createStdout(40);
    const items = ref(['above']);

    const app = createApp({
      render: () =>
        box(
          {},
          h(
            Static,
            { items: items.value },
            {
              default: ({ item }: { item: string }) =>
                span({ key: item }, item),
            },
          ),
          span({}, 'below'),
        ),
    });
    app.mount({ stdout });

    await flush();

    // The static flush (a plain sequential write) and the dynamic frame (via
    // the cursor-repainted `write`) are written separately -- the frame
    // itself must not also carry the static item's text.
    const frameWrites = stdout
      .getWrites()
      .filter(text => text.includes('below'));

    expect(frameWrites).toHaveLength(1);
    expect(frameWrites[0]).not.toContain('above');

    app.unmount();
  });

  it('survives a terminal resize instead of being permanently wiped', async () => {
    // `Container#onResize` (`src/Container.ts`) writes `clearTerminal` on
    // every resize -- wiping everything on screen, including already-flushed
    // `<Static>` content. Before this fix, `staticFlushedCount`
    // (`src/tree/render.ts`) still remembered that content as printed, so it
    // was gone from the screen *and* never printed again. ink's `<Static>`
    // survives a resize; so must ours.
    const stdout = createStdout(40);
    const items = ref(['first']);

    const countWritesContaining = (needle: string) =>
      stdout.getWrites().filter(text => text.includes(needle)).length;

    const app = createApp({
      render: () =>
        box(
          {},
          h(
            Static,
            { items: items.value },
            {
              default: ({ item }: { item: string }) =>
                span({ key: item }, item),
            },
          ),
        ),
    });
    app.mount({ stdout });

    await flush();
    expect(countWritesContaining('first')).toBe(1);

    stdout.columns = 60;
    stdout.emit('resize');
    await flush();

    // Reprinted after the resize -- not lost forever, and not left off
    // screen just because it was already flushed once before.
    expect(countWritesContaining('first')).toBe(2);

    app.unmount();
  });

  it('does not lose an item mounted in the same tick as unmount', async () => {
    // Reproduces the race directly: a `flush: 'post'` watcher runs
    // synchronously right after Vue patches the DOM for the `items` change
    // -- in the same tick that patch's `insertChild` already emitted
    // `DOMChanged`, scheduling a frame via `process.nextTick`. Calling
    // `unmount()` from inside that same synchronous watcher callback used
    // to race that scheduled frame: `Renderer#destroy()` (`src/tree/render.ts`)
    // set `destroyed` before the queued callback ever ran, so it bailed out
    // without ever calling `collectStaticOutput` for the item that had
    // already been mounted.
    const stdout = createStdout(40);
    const items = ref(['first']);

    const countWritesContaining = (needle: string) =>
      stdout.getWrites().filter(text => text.includes(needle)).length;

    const app = createApp({
      setup() {
        watch(
          items,
          value => {
            if (value.length > 1) app.unmount();
          },
          { flush: 'post' },
        );

        return () =>
          box(
            {},
            h(
              Static,
              { items: items.value },
              {
                default: ({ item }: { item: string }) =>
                  span({ key: item }, item),
              },
            ),
          );
      },
    });
    app.mount({ stdout });

    await flush();
    expect(countWritesContaining('first')).toBe(1);

    items.value = [...items.value, 'second'];
    await flush();

    expect(countWritesContaining('second')).toBe(1);
  });
});
