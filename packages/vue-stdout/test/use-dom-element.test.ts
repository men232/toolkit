import { h, nextTick, ref, type ShallowRef } from 'vue';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/createApp';
import { measureElement } from '../src/measureElement';
import { useDOMElement } from '../src/hooks/useDOMElement';
import type { DOMElement } from '../src/tree';
import { createStdout } from './helpers/create-stdout';

const box = (props: any, ...kids: any[]) => h('stdout-box', props, kids);
const span = (props: any, ...kids: any[]) => h('stdout-text', props, kids);

const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

/**
 * `useDOMElement` hands back the calling component's own root `DOMElement`,
 * so anything measuring through it (`measureElement`, `useBoxMetrics`,
 * `useContainerSize`) is only ever as correct as this ref is current. These
 * two tests pin the two ways it used to go wrong: a root vnode that is
 * *replaced* rather than patched in place, and teardown.
 */
describe('useDOMElement', () => {
  it('re-syncs when the component swaps its root element', async () => {
    const stdout = createStdout(40);
    const wide = ref(false);

    let node!: ShallowRef<DOMElement | null>;

    // Keyed roots: a changing `key` makes Vue unmount the old element and
    // mount a brand-new one rather than patching the existing one, which is
    // exactly what `v-if` on a root, or a `<component :is>` root, does.
    const app = createApp({
      setup() {
        node = useDOMElement();

        return () =>
          wide.value
            ? box({ key: 'wide', width: 20, height: 1 }, span({}, 'b'))
            : box({ key: 'narrow', width: 5, height: 1 }, span({}, 'a'));
      },
    });
    app.mount({ stdout, maxFps: 0 });

    await flush();

    const firstElement = node.value;
    expect(firstElement).not.toBeNull();
    expect(measureElement(firstElement!).width).toBe(5);

    wide.value = true;
    await nextTick();
    await flush();

    // The ref must point at the *new* root, not merely be non-null: the old
    // element is detached now, and measuring through it reports the old
    // width forever.
    expect(node.value).not.toBe(firstElement);
    expect(firstElement!.parentNode).toBeNull();
    expect(measureElement(node.value!).width).toBe(20);

    app.unmount();
  });

  it('clears the ref when the component unmounts', async () => {
    const stdout = createStdout(40);
    const visible = ref(true);

    let node!: ShallowRef<DOMElement | null>;

    const Child = {
      setup() {
        node = useDOMElement();
        return () => box({ width: 5, height: 1 }, span({}, 'a'));
      },
    };

    const app = createApp({
      setup() {
        return () => box({}, visible.value ? h(Child) : null);
      },
    });
    app.mount({ stdout, maxFps: 0 });

    await flush();
    expect(node.value).not.toBeNull();

    visible.value = false;
    await nextTick();
    await flush();

    // Holding on to a detached element is worse than reporting nothing:
    // after `Container.destroy()` nulls the Yoga nodes, `measureElement`
    // silently reads zeros through it instead of the caller noticing the
    // target is gone.
    expect(node.value).toBeNull();

    app.unmount();
  });
});
