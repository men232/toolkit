import { expectTypeOf, test } from 'vitest';
import type { BoxProps } from './Box';
import type {
  Camelize,
  Hyphenate,
  KebabPropKey,
  KebabPropKeys,
} from './kebabProps';
import type { NewLineProps } from './NewLine';
import type { ProgressBarProps } from './ProgressBar';
import type { StaticProps } from './Static';
import type { TextProps } from './Text';
import type { TransformProps } from './Transform';

/**
 * The prop types of the two components that route through `camelizeProps`.
 *
 * `ErrorBoundaryProps` is absent on purpose and is not an omission: its
 * component declares `props: []`, so Vue routes *everything* to `attrs` and it
 * reads no prop at all. The other five catalog components are accounted for
 * below.
 */
type CamelizedProps = BoxProps | TextProps;

/**
 * The load-bearing assertion of this fix, and the reason a partial repair
 * cannot ship.
 *
 * `KEBAB_PROP_KEYS` is a hand-written list; a hand-written list meant to mirror
 * a type is exactly what rots. Equality is asserted in **both** directions, so
 * adding a multi-word prop to `Styles`, `BoxProps` or `TextProps` and not
 * listing it fails `pnpm test` (which runs `--typecheck`), and so does listing
 * a key that no longer exists.
 *
 * A fix that repaired `border-style` and left `flex-direction` inert would be
 * worse than none — the class would look handled — and this is what rules that
 * out. `vue-tsc` cannot: it *approves* the hyphenated spelling, resolving it
 * back to the camelCase prop, so the template about to paint nothing
 * type-checks perfectly. The type-checker is not the evidence here; this
 * assertion and the rendering tests in `test/template-kebab-props.test.tsx`
 * are.
 */
test('KEBAB_PROP_KEYS is exactly the multi-word props of the camelized catalog', () => {
  expectTypeOf<KebabPropKeys<CamelizedProps>>().toEqualTypeOf<KebabPropKey>();
});

/**
 * The rest of the catalog, accounted for so that "only `Box` and `Text` route
 * through `camelizeProps`" is a proved statement rather than a claim.
 *
 * `Transform`, `Static` and `NewLine` are the other components with **no**
 * runtime `props` declaration, so Vue camelizes nothing for them either — they
 * are safe only because every prop they take is a single word (`transform`,
 * `items`, `count`) and therefore has no hyphenated spelling to miss. Give any
 * of them a multi-word prop and this assertion fails, which is the signal to
 * route that component through `camelizeProps` as well.
 */
test('the undeclared components that skip the rewrite have nothing to rewrite', () => {
  expectTypeOf<
    KebabPropKeys<TransformProps | StaticProps | NewLineProps>
  >().toEqualTypeOf<never>();
});

/**
 * `ProgressBar` is the one catalog component that gets camelization from Vue
 * itself: it declares `props` as a string array, and Vue camelizes both the
 * declared names (`normalizePropsOptions`) and each incoming key
 * (`setFullProps`). Its multi-word props are named here so the fact is written
 * down; `test/template-kebab-props.test.tsx` proves it by rendering rather than
 * by reading Vue's source, and also pins the declaration against
 * `ProgressBarProps` — a prop missing from that array is invisible to Vue in
 * *both* spellings.
 */
test('ProgressBar’s multi-word props are the ones Vue camelizes for it', () => {
  expectTypeOf<KebabPropKeys<ProgressBarProps>>().toEqualTypeOf<
    'showPercent' | 'backgroundColor'
  >();

  // The type side of the declaration pin in
  // `test/template-kebab-props.test.tsx`: that test asserts the runtime
  // `props` array holds exactly these names, and this asserts the type does.
  // The two together are what make "every ProgressBar prop is visible to Vue,
  // in both spellings" checkable.
  expectTypeOf<keyof ProgressBarProps>().toEqualTypeOf<
    | 'value'
    | 'min'
    | 'max'
    | 'color'
    | 'backgroundColor'
    | 'showPercent'
    | 'variant'
  >();
});

/**
 * `KebabPropKeys` selects "has a hyphenated spelling", not "contains a
 * hyphen" — a single-word prop hyphenates to itself and needs no alias, and
 * putting one in the table would mean a lookup that can never match.
 */
test('KebabPropKeys ignores props with no hyphenated spelling', () => {
  expectTypeOf<KebabPropKeys<{ color?: string; gap?: number }>>().toEqualTypeOf<
    never
  >();
  expectTypeOf<
    KebabPropKeys<{ borderStyle?: string; gap?: number }>
  >().toEqualTypeOf<'borderStyle'>();
});

/** `Hyphenate` mirrors Vue's `/\B([A-Z])/g` — including the leading-capital case. */
test('Hyphenate matches Vue’s hyphenate', () => {
  expectTypeOf<Hyphenate<'borderStyle'>>().toEqualTypeOf<'border-style'>();
  expectTypeOf<
    Hyphenate<'borderTopDimColor'>
  >().toEqualTypeOf<'border-top-dim-color'>();
  expectTypeOf<Hyphenate<'marginX'>>().toEqualTypeOf<'margin-x'>();
  expectTypeOf<Hyphenate<'color'>>().toEqualTypeOf<'color'>();
  expectTypeOf<Hyphenate<'Box'>>().toEqualTypeOf<'box'>();
});

/**
 * The round trip, and the reason the two halves of the catalog agree.
 *
 * `Box`/`Text` accept the spelling this file's `hyphenate` produces;
 * `ProgressBar` accepts whatever Vue's `camelize` maps back to a declared name.
 * Asserting `Camelize<Hyphenate<K>> === K` for every listed prop proves the two
 * rules answer the same for all of them, so `border-style` and `show-percent`
 * are not accepted by different criteria.
 */
test('every alias spelling camelizes back to the prop it aliases', () => {
  expectTypeOf<Camelize<Hyphenate<KebabPropKey>>>().toEqualTypeOf<KebabPropKey>();
});
