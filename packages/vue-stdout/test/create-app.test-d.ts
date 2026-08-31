// Type-level counterpart to `test/create-app.test.ts`, run by
// `vitest --typecheck`.
//
// `StdoutApp` cannot simply `extend` Vue's `App`: its `mount` takes streams,
// not a DOM container, so the two signatures are incompatible and TypeScript
// rejects the narrowing. It is therefore `Omit<App, 'mount' | ...>` plus
// hand-written declarations -- and a hand-written declaration is exactly the
// thing that silently drifts from Vue's own.
//
// Two failure modes this file exists to catch:
//
//  - `Omit` is a mapped type, so it resolves the polymorphic `this` that
//    Vue's `use`/`component`/`directive`/`provide`/`mixin` return down to a
//    plain `App`. Left alone, `createApp(C).use(p)` would type-check and then
//    `.mount({ stdout })` would not -- the chain every Vue user writes
//    without thinking would be a compile error.
//  - anything genuinely dropped from Vue's surface. `config`,
//    `runWithContext`, `version` and `onUnmount` are not re-declared, so an
//    over-eager `Omit` would take them out silently.
import { expectTypeOf, test } from 'vitest';
import { defineComponent, h } from 'vue';
import type {
  App,
  Component,
  ComponentPublicInstance,
  Directive,
  Plugin,
} from 'vue';
import { createApp } from '../src/createApp';
import type { MountOptions, StdoutApp } from '../src/createApp';

const Root = defineComponent({ render: () => h('stdout-box') });

test('the fluent methods keep returning the terminal app, so chaining reaches mount()', () => {
  const app = createApp(Root);
  const plugin: Plugin<[string]> = { install: () => {} };

  expectTypeOf(app.use(plugin, 'x')).toEqualTypeOf<StdoutApp>();
  expectTypeOf(app.mixin({})).toEqualTypeOf<StdoutApp>();
  expectTypeOf(app.component('X', Root)).toEqualTypeOf<StdoutApp>();
  expectTypeOf(app.directive('x', {} as Directive)).toEqualTypeOf<StdoutApp>();
  expectTypeOf(app.provide('k', 1)).toEqualTypeOf<StdoutApp>();

  // The whole point of the above: this expression has to compile.
  expectTypeOf(
    createApp(Root).use(plugin, 'x').mount({ stdout: process.stdout }),
  ).toEqualTypeOf<ComponentPublicInstance>();
});

test('the read-back overloads still narrow the way Vue s do', () => {
  const app = createApp(Root);

  expectTypeOf(app.component('X')).toEqualTypeOf<Component | undefined>();
  expectTypeOf(app.directive('x')).toEqualTypeOf<
    Directive<unknown, unknown> | undefined
  >();
});

test('mount() takes MountOptions, or a bare stream, or nothing', () => {
  const app = createApp(Root);

  expectTypeOf(app.mount).parameter(0).toEqualTypeOf<
    MountOptions | NodeJS.WriteStream | undefined
  >();
  expectTypeOf(app.mount()).toEqualTypeOf<ComponentPublicInstance>();

  // @ts-expect-error a DOM-style container is not a mount target here -- this
  // is the substitution `render()`'s removal is meant to make impossible.
  app.mount('#app');
});

test('Vue s non-fluent app surface survives the Omit', () => {
  const app = createApp(Root);

  expectTypeOf(app.config).toEqualTypeOf<App['config']>();
  expectTypeOf(app.version).toEqualTypeOf<string>();
  expectTypeOf(app.unmount).toEqualTypeOf<App['unmount']>();
  expectTypeOf(app.onUnmount).toEqualTypeOf<App['onUnmount']>();
  expectTypeOf(app.runWithContext<number>).toEqualTypeOf<
    (fn: () => number) => number
  >();

  // The two `config` members a consumer of `render()` could never reach.
  expectTypeOf(app.config.errorHandler).toEqualTypeOf<
    App['config']['errorHandler']
  >();
  expectTypeOf(app.config.warnHandler).toEqualTypeOf<
    App['config']['warnHandler']
  >();
});

test('waitUntilExit() is a plain promise, callable before mount', () => {
  expectTypeOf(createApp(Root).waitUntilExit()).toEqualTypeOf<Promise<void>>();
});

test('createApp takes optional root props', () => {
  expectTypeOf(createApp).parameter(1).toEqualTypeOf<
    Record<string, unknown> | null | undefined
  >();
});
