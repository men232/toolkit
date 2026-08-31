/**
 * Normalisation for the other name a `<template>` produces that JSX never does:
 * the hyphenated spelling of a prop.
 *
 * `<Box border-style="round">` is what HTML habit writes, and until this existed
 * it painted **no border** — along with `flex-direction`, `justify-content`,
 * `padding-x` and every other multi-word prop on the catalog. Vue camelizes an
 * incoming attribute name only while matching it against a *declared* prop, and
 * `Box`, `Text`, `Transform`, `Static` and `NewLine` are bare
 * `FunctionalComponent<Props>` values with no `.props`, so `instance.props` is
 * the raw attrs object and the key arrives verbatim, unread.
 *
 * As with the bare boolean attribute (`booleanProps.ts`), `vue-tsc` approves the
 * broken form: Volar resolves the hyphenated name back to the camelCase prop and
 * type-checks a template that is about to paint nothing.
 *
 * ## Why not just declare the props
 *
 * The same two measurements that rejected a runtime `props` declaration for the
 * boolean cast reject it here — a partial declaration deletes every undeclared
 * prop, and a declared absent `Boolean` arrives as `false` and erases every
 * border. Both are stated in full, with their figures, in `booleanProps.ts`,
 * which is where they were first taken; they were re-verified against
 * Vue 3.5.13 for this fix rather than inherited.
 *
 * A *complete* declaration of all ~70 props would dodge the first but not the
 * second, and would still be hand-maintained — this file's list, with a worse
 * failure mode.
 *
 * So the rewrite happens here, where component props become host attributes,
 * over an explicit alias table. Only names the catalog declares are rewritten: a
 * key that merely *contains* a hyphen — `data-*`, `aria-*`, anything spread
 * through `v-bind` — is left exactly as it arrived, as Vue leaves an undeclared
 * hyphenated attribute.
 *
 * ## Ordering with the boolean cast
 *
 * `<Text dim-color>` hits both defects at once: the wrong key carrying the wrong
 * value (`""`). The rewrite must run *first*, so `castBooleanProps` sees a
 * `dimColor` it recognises — hence `castBooleanProps(camelizeProps(props))`.
 *
 * ## Which components route through this
 *
 * `Box` and `Text`, and no others. `kebabProps.test-d.ts` proves that exhaustive
 * rather than asserting it:
 *
 * - the components with no runtime declaration are `Box`, `Text`, `Transform`,
 *   `Static`, `NewLine`. `TransformProps`, `StaticProps` and `NewLineProps` are
 *   proved to have *no* multi-word prop between them (`transform`, `items`,
 *   `count`), so there is nothing to rewrite; **adding one breaks that
 *   assertion**, which is the signal to route that component through here too;
 * - `ProgressBar` and `ErrorBoundary` *do* declare `props`, so Vue camelizes for
 *   them (`normalizePropsOptions` camelizes the declared names,
 *   `setFullProps` each incoming key). Measured: with
 *   `props: ['showPercent', 'value']`, `{ 'show-percent': '', value: 1 }`
 *   arrived as `{ showPercent: '', value: 1 }`.
 *   `test/template-kebab-props.test.tsx` pins that with a real render;
 * - `Spacer` takes no props at all.
 */

/**
 * Type-level twin of the runtime `hyphenate` below, mirroring Vue's own
 * (`/\B([A-Z])/g` → `-$1`, lowercased; a leading capital is *not* hyphenated,
 * as `\B` specifies). The two are held to the same answers by
 * `kebabProps.test-d.ts`, which computes the alias spellings from this type
 * while the alias table computes them from the function.
 */
export type Hyphenate<S extends string> = S extends `${infer First}${infer Rest}`
  ? `${Lowercase<First>}${HyphenateTail<Rest>}`
  : S;

type HyphenateTail<S extends string> = S extends `${infer Char}${infer Rest}`
  ? Char extends Lowercase<Char>
    ? `${Char}${HyphenateTail<Rest>}`
    : `-${Lowercase<Char>}${HyphenateTail<Rest>}`
  : S;

/**
 * `S` with `-x` turned into `X`, mirroring Vue's own `camelize`
 * (`/-(\w)/g` → uppercased capture).
 *
 * Only used to prove the round trip: that the spelling this file accepts for a
 * prop is the same spelling Vue would have camelized back to it, so the
 * components that get their camelization from Vue and the ones that get it
 * here agree on which names work.
 */
export type Camelize<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<Camelize<Tail>>}`
  : S;

/**
 * The keys of `T` that have a hyphenated spelling at all — the multi-word ones.
 *
 * Distributive over a union of prop types, so
 * `KebabPropKeys<BoxProps | TextProps>` is the union of each one's keys rather
 * than `keyof` their intersection. A single-word key such as `color` or `gap`
 * hyphenates to itself and is excluded: no template can spell it any other way,
 * so it needs no alias.
 */
export type KebabPropKeys<T> = T extends unknown
  ? {
      [K in keyof T]-?: K extends string
        ? Hyphenate<K> extends K
          ? never
          : K
        : never;
    }[keyof T]
  : never;

/**
 * Every multi-word prop reachable through `<Box>` or `<Text>` — the two
 * components that route their props through {@link camelizeProps}.
 *
 * Kept in sync with the prop types by `kebabProps.test-d.ts`, not by
 * discipline: that file asserts set equality in both directions, so adding a
 * multi-word prop to `Styles`, `BoxProps` or `TextProps` and not listing it
 * here fails `pnpm test` at the type level.
 */
export const KEBAB_PROP_KEYS = [
  // Spacing
  'marginX',
  'marginY',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'paddingX',
  'paddingY',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'columnGap',
  'rowGap',
  // Flex
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'flexDirection',
  'flexWrap',
  'alignItems',
  'alignSelf',
  'alignContent',
  'justifyContent',
  // Sizing
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'aspectRatio',
  'overflowX',
  'overflowY',
  // Borders
  'borderStyle',
  'borderTop',
  'borderBottom',
  'borderLeft',
  'borderRight',
  'borderColor',
  'borderTopColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderRightColor',
  'borderDimColor',
  'borderTopDimColor',
  'borderBottomDimColor',
  'borderLeftDimColor',
  'borderRightDimColor',
  'borderBackgroundColor',
  'borderTopBackgroundColor',
  'borderBottomBackgroundColor',
  'borderLeftBackgroundColor',
  'borderRightBackgroundColor',
  // Text
  'backgroundColor',
  'dimColor',
  'textWrap',
] as const satisfies readonly string[];

export type KebabPropKey = (typeof KEBAB_PROP_KEYS)[number];

/**
 * Vue's `hyphenate`, reproduced rather than imported: the function lives in
 * `@vue/shared`, which is a transitive dependency of `vue` and not a declared
 * one of this package. `kebabProps.test-d.ts` holds it to the same answers as
 * the {@link Hyphenate} type.
 *
 * @internal
 */
const hyphenate = (key: string): string =>
  key.replace(/\B([A-Z])/g, '-$1').toLowerCase();

/**
 * Hyphenated spelling → the prop it means, for every key in
 * {@link KEBAB_PROP_KEYS} and nothing else.
 *
 * A null-prototype object rather than an object literal: lookups are done with
 * a bare index on caller-supplied keys, and an inherited `toString` or
 * `constructor` answering one would rewrite a prop name that was never
 * declared.
 */
const KEBAB_PROP_ALIASES: Record<string, KebabPropKey | undefined> =
  /* @__PURE__ */ (() => {
    const aliases: Record<string, KebabPropKey | undefined> =
      Object.create(null);

    for (const key of KEBAB_PROP_KEYS) aliases[hyphenate(key)] = key;

    return aliases;
  })();

/**
 * `props` with every hyphenated catalog prop name replaced by the camelCase name
 * it means — the rewrite Vue would have applied had the prop been declared.
 * Non-catalog keys are copied untouched, hyphen or no hyphen.
 *
 * Each rewritten key keeps its original position, so a props object spelling the
 * same prop both ways resolves to the last one written, exactly as Vue's
 * `setFullProps` does.
 *
 * Returns `props` itself when there is nothing to rewrite — every JSX render and
 * every camelCase template — so the allocation only happens where needed.
 *
 * Walked with `for...in`, as Vue walks a raw props object in `setFullProps` and
 * `mergeProps`; those two are the only builders of the object this receives, so
 * its keys are always own, enumerable and strings.
 */
export function camelizeProps<T extends object>(props: T): T {
  let hasAlias = false;

  for (const key in props) {
    if (KEBAB_PROP_ALIASES[key] === undefined) continue;
    hasAlias = true;
    break;
  }

  if (!hasAlias) return props;

  const camelized: Record<string, unknown> = {};

  for (const key in props) {
    camelized[KEBAB_PROP_ALIASES[key] ?? key] = (
      props as Record<string, unknown>
    )[key];
  }

  return camelized as T;
}
