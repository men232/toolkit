import { describe, expect, it } from 'vitest';
import { Box, NewLine, Text } from '../src';
import { renderToString } from '../src/index';

// TSX equivalent of `test/sfc-vite.test.ts`'s "does not warn about unknown
// components" case. `NewLine.tsx` compiles down to the intrinsic tag
// `<stdout-text>` (see its source) -- without `isCustomElement` wired into
// `vueJsx()` (`vitest.config.ts`), the JSX transform falls back to
// `resolveComponent('stdout-text')`, which warns ("Failed to resolve
// component"). `Box.tsx` and `Text.tsx` used to be in that set and called
// `resolveComponent` too -- for `Box` that recursed forever, since its own
// inferred name is `Box` and `resolveComponent`'s self-reference check matched
// it right back. Both call `h()` now (see `Box.tsx`), so `NewLine` is what
// keeps this case honest.
describe('vite preset: jsx', () => {
  it('renders Box/Text/NewLine without warning about unknown components', () => {
    const warnings: string[] = [];
    const original = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(String(args[0]));

    let output: string;
    try {
      output = renderToString(
        {
          render: () => (
            <Box flexDirection="column">
              <Text>hello</Text>
              <NewLine />
              <Text>world</Text>
            </Box>
          ),
        },
        { columns: 20 },
      );
    } finally {
      console.warn = original;
    }

    expect(output).toBe('hello\n\n\nworld');
    expect(
      warnings.filter(w => w.includes('Failed to resolve component')),
    ).toEqual([]);
  });

  // Which compiler produced this file is not a detail -- it decides the
  // runtime semantics of every JSX call site in the package, and for a long
  // time it was not the one the package ships with. Vite's built-in transform
  // (`vite:oxc`) sits ahead of the normal plugin bucket in `resolvePlugins()`,
  // so it claimed `.tsx` before `unplugin-vue-jsx` could and compiled the JSX
  // itself via `tsconfig.json`'s `"jsx": "react-jsx"` + `"jsxImportSource":
  // "vue"`. `vue/jsx-runtime` is four lines -- it pulls `children` off the
  // props and calls `h(type, props, children)` -- so a component's children
  // arrive as a **value** where `@vue/babel-plugin-jsx` would have passed a
  // slot function. `vite.config.ts` now pins `enforce: 'pre'`; this case is
  // what stops that regressing silently.
  //
  // The case above cannot catch it: both compilers render the same string, and
  // it filters warnings down to "Failed to resolve component". A green suite
  // is not evidence about JSX semantics unless something asserts the shape.
  // See `.agents/docs/gotchas.md#dev-and-build-compiled-jsx-with-different-semantics`.
  it('passes component children as a slot function, not a `children` prop', () => {
    const vnode = (
      <Box flexDirection="column">
        <Text>x</Text>
      </Box>
    );

    // `vue/jsx-runtime` deletes `children` from props and hands it to `h()` as
    // the third argument, which for a component lands in `vnode.children` as a
    // raw value. `@vue/babel-plugin-jsx` emits `{ default: () => [...] }`.
    const children: unknown = vnode.children;
    expect(typeof children).toBe('object');
    expect(children).not.toBeNull();
    const slots = children as Record<string, unknown>;
    expect(typeof slots.default).toBe('function');
  });
});
