import type { AnyFunction, Fn } from '@andrew_l/toolkit';
import { type MaybeRefOrGetter, onScopeDispose, toValue, watch } from 'vue';
import type { DOMNode } from '../tree';

export function useEventListener(
  target: MaybeRefOrGetter<DOMNode | null>,
  eventName: string,
  listener: AnyFunction,
): Fn {
  const cleanups: Function[] = [];
  const cleanup = () => {
    cleanups.forEach(fn => fn());
    cleanups.length = 0;
  };

  const register = (el: DOMNode, event: string, listener: any) => {
    el.on(event, listener);
    return () => {
      el.off(event, listener);
    };
  };

  const stopWatch = watch(
    () => toValue(target),
    el => {
      cleanup();
      if (!el) return;
      cleanups.push(register(el, eventName, listener));
    },
    { immediate: true, flush: 'post' },
  );

  const stop = () => {
    stopWatch();
    cleanup();
  };

  onScopeDispose(stop);

  return stop;
}
