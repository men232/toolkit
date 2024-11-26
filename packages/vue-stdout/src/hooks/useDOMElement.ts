import {
  type ShallowRef,
  getCurrentInstance,
  onMounted,
  shallowRef,
} from 'vue';
import type { DOMElement } from '../tree';

export function useDOMElement(): ShallowRef<DOMElement | null> {
  const instance = getCurrentInstance();
  const node = shallowRef<DOMElement | null>(null);

  onMounted(() => {
    node.value = (instance as any).vnode?.el ?? null;
  });

  return node;
}
