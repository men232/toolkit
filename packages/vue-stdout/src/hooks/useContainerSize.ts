import { type MaybeRefOrGetter, ref, toValue, watch } from 'vue';
import type { DOMElement } from '../tree';
import { useEventListener } from './useEventListener';

export function useContainerSize(target: MaybeRefOrGetter<DOMElement | null>) {
  const width = ref(0);
  const height = ref(0);

  const computeSize = (node: DOMElement) => {
    const box = node.getBoundingClientRect();

    width.value = box.width;
    height.value = box.height;
  };

  useEventListener(target, 'resize', () => {
    computeSize(toValue(target)!);
  });

  watch(
    () => toValue(target),
    newNode => {
      if (newNode) computeSize(newNode);
    },
    { immediate: true },
  );

  return { width, height };
}
