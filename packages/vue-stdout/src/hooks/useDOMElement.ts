import {
  type ShallowRef,
  getCurrentInstance,
  onMounted,
  onUnmounted,
  onUpdated,
  shallowRef,
} from 'vue';
import type { DOMElement } from '../tree';

/**
 * The calling component's own root `DOMElement`, as a ref -- the target you
 * hand to `useBoxMetrics`/`useContainerSize`/`measureElement`.
 *
 * Kept in sync rather than captured once, because the root vnode can be
 * *replaced* rather than patched in place (`v-if` on the root, `<component
 * :is>`, a changed `key`): the old element is detached at that point and
 * measuring through it would report its last layout forever. `onUpdated` fires
 * after this component's own patch, so `vnode.el` is current by then. Cleared
 * on unmount for the same reason -- `measureElement` reads zeros through a
 * detached element, so `null` is the honest answer.
 */
export function useDOMElement(): ShallowRef<DOMElement | null> {
  const instance = getCurrentInstance();
  const node = shallowRef<DOMElement | null>(null);

  const sync = () => {
    node.value = (instance?.vnode?.el as DOMElement | null) ?? null;
  };

  onMounted(sync);
  onUpdated(sync);
  onUnmounted(() => {
    node.value = null;
  });

  return node;
}
