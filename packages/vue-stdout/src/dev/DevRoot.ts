import { type Component, defineComponent, h } from '@vue/runtime-core';

/**
 * Wraps the user's root component in one dev-only parent.
 *
 * **Internal, and not an error overlay.** It exists for a mechanical reason in
 * Vue itself: `__VUE_HMR_RUNTIME__.reload` -- the branch an edited SFC takes
 * whenever the change was not template-only -- recreates a component by calling
 * `instance.parent.update()`. The **root** component has no `instance.parent`,
 * so it falls through to `instance.appContext.reload`, a different and far less
 * exercised path. Giving the user's root a parent keeps every hot update on the
 * one branch Vue actually tests.
 *
 * Installed by `createApp()` only when a dev server has connected, so a
 * production tree has exactly the depth its author wrote. The one visible
 * consequence in dev is that `mount()` returns this wrapper's instance rather
 * than the user root's.
 */
export function createDevRoot(
  root: Component,
  rootProps: Record<string, unknown> | null,
): Component {
  return defineComponent({
    name: 'VueStdoutDevRoot',
    setup() {
      return () => h(root, rootProps ?? undefined);
    },
  });
}
