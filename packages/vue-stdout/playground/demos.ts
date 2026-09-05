import type { Component } from 'vue';
import { type DemoInfo, type DemoName, catalog } from './catalog';
import CounterDemo from './demos/Counter.vue';
import FocusDemo from './demos/Focus.vue';
import LayoutDemo from './demos/layout';
import ProgressDemo from './demos/Progress.vue';
import StaticDemo from './demos/Static.vue';
import TextDemo from './demos/Text.vue';

export interface Demo extends DemoInfo {
  component: Component;
}

/**
 * Registered by hand rather than discovered from the directory: the list is
 * imported statically so `vue-tsc` type-checks every demo, and so a demo that
 * fails to compile breaks `pnpm check-types` instead of silently vanishing
 * from the menu.
 *
 * `Record<DemoName, …>` is what keeps this table and `catalog.ts` in step: a
 * catalog entry with no component here is a missing property, a component with
 * no catalog entry is an excess one, and either fails `pnpm check-types`.
 *
 * Five of the six are single-file components, because that is this package's
 * primary authoring surface. `layout` is deliberately the exception: JSX is a
 * supported supplementary path, and one demo staying `.tsx` keeps it compiled,
 * type-checked and mounted by `test/playground.test.ts` on every run rather
 * than only by the type-level fixtures. See `.agents/docs/intent.md`.
 */
const components: Record<DemoName, Component> = {
  layout: LayoutDemo,
  text: TextDemo,
  focus: FocusDemo,
  static: StaticDemo,
  progress: ProgressDemo,
  counter: CounterDemo,
};

export const demos: Demo[] = catalog.map(info => ({
  ...info,
  component: components[info.name],
}));

export const findDemo = (name: string): Demo | undefined =>
  demos.find(demo => demo.name === name);
