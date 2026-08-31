import { expectTypeOf, test } from 'vitest';
import type { BoxProps } from './Box';
import type { BooleanPropKey, BooleanPropKeys } from './booleanProps';
import type { ErrorBoundaryProps } from './ErrorBoundary';
import type { NewLineProps } from './NewLine';
import type { ProgressBarProps } from './ProgressBar';
import type { StaticProps } from './Static';
import type { TextProps } from './Text';
import type { TransformProps } from './Transform';

/**
 * Every prop type the exported catalog authors against. `<Spacer>` takes no
 * props and so contributes nothing.
 *
 * A new component belongs in this union. Forgetting is not left to discipline:
 * `test/template-boolean-props.test.tsx` pins the set of exported components
 * and fails with a pointer back here when one is added.
 */
type CatalogProps =
  | BoxProps
  | ErrorBoundaryProps
  | NewLineProps
  | ProgressBarProps
  | StaticProps
  | TextProps
  | TransformProps;

/**
 * The load-bearing assertion of this whole fix.
 *
 * `BOOLEAN_PROP_KEYS` is a hand-written list, and a hand-written list that is
 * supposed to mirror a type is exactly the kind of thing that silently rots.
 * This makes the two sides one fact: equality is asserted in **both**
 * directions, so adding a boolean prop anywhere on the catalog and not listing
 * it fails `pnpm test` (which runs `--typecheck`), and so does listing a key
 * that no longer exists.
 *
 * It is worth being explicit about why the ordinary safety net does not apply
 * here: `vue-tsc` *approves* the broken form. Volar models `<Text bold>` as
 * `bold: true`, so the template that is about to render undimmed, unbolded text
 * type-checks perfectly. The type-checker cannot be the evidence; this
 * assertion and the rendering tests beside it are.
 */
test('BOOLEAN_PROP_KEYS is exactly the catalog’s boolean props', () => {
  expectTypeOf<BooleanPropKeys<CatalogProps>>().toEqualTypeOf<BooleanPropKey>();
});

/**
 * The predicate is tuple-wrapped so that "includes boolean" does not count as
 * "is boolean". `children?: VNodeChild` is the case that forced it — a vnode
 * child may legitimately be a boolean — and a `children` key in the cast list
 * would have `castBooleanProps` rewriting slot content.
 */
test('BooleanPropKeys ignores props that merely admit a boolean', () => {
  expectTypeOf<BooleanPropKeys<BoxProps>>().not.toEqualTypeOf<'children'>();
  expectTypeOf<BooleanPropKeys<{ a?: boolean; b?: number }>>().toEqualTypeOf<'a'>();
  expectTypeOf<
    BooleanPropKeys<{ a?: boolean | string }>
  >().toEqualTypeOf<never>();
});
