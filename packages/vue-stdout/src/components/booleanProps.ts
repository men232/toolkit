/**
 * Normalisation for the one value a `<template>` produces that JSX never does:
 * the empty string a bare boolean attribute compiles to.
 *
 * `<Text bold>` is `bold: true` from JSX and `bold: ""` from a template. Vue
 * turns that empty string into `true` only for props it can see declared as
 * `Boolean` at runtime, and this catalog declares none — `Box`, `Text`,
 * `Transform` and `Static` are bare `FunctionalComponent<Props>` values with no
 * `.props`, so every attribute arrives verbatim. The empty string is falsy, so
 * the prop silently did nothing, and `vue-tsc` approved it: Volar models a bare
 * attribute as `true`, which is what the author meant and not what ran.
 *
 * ## Why not just declare the props
 *
 * Two independent reasons, both verified against Vue 3.5.13 rather than assumed:
 *
 * 1. **A `props` declaration is all-or-nothing per component.** Once
 *    `Component.props` exists, Vue routes only the declared names into `props`
 *    and every other attribute becomes an `attrs` entry the component body
 *    never reads. `Box` spreads `{...props}` straight onto its host element and
 *    `Styles` is ~70 properties wide, so a declaration listing only the boolean
 *    names would delete every colour, size and flex property on the way
 *    through. Measured: with `props: { bold: Boolean }`, `h(Probe, { bold: '',
 *    color: 'green' })` delivered `{ bold: true }` — `color` was gone.
 * 2. **A declared `Boolean` prop that is absent arrives as `false`, not
 *    `undefined`.** `borderTop`/`borderBottom`/`borderLeft`/`borderRight`
 *    default to *on* and are read as `props.borderTop !== false`
 *    (`src/tree/render.ts`), and `applyStyles` keys off `'borderStyle' in
 *    style`. Declaring them `Boolean` would hand every `<Box>` an explicit
 *    `borderTop: false` and erase every border in the package.
 *
 * So the cast happens here, at the boundary where component props become host
 * attributes, over an explicit key list. The list's obvious failure mode — that
 * it drifts from the types it is supposed to mirror — is closed by
 * `booleanProps.test-d.ts`, which asserts it is exactly the set of
 * boolean-typed props across the whole exported catalog, and by
 * `test/template-boolean-props.test.tsx`, which drives each key through its real
 * component. Adding a boolean prop anywhere and not listing it here fails
 * `pnpm test` at the type level.
 *
 * Runs *after* `camelizeProps` (`kebabProps.ts`) in both components that use
 * it, and the order is load-bearing: `<Text dim-color>` arrives with the wrong
 * key *and* the empty string, and the list below only names camelCase keys.
 *
 * Deliberately narrower than Vue's own cast in one respect: Vue also treats the
 * hyphenated prop name appearing as the *value* as truthy
 * (`<Text bold="bold">`). That HTML-ism is not reproduced — nothing in this
 * package or in ink asks for it, and `<Text bold>` already says it.
 */

/**
 * The keys of `T` whose type is exactly `boolean`.
 *
 * Distributive over a union of prop types, so
 * `BooleanPropKeys<BoxProps | TextProps>` is the union of each one's boolean
 * keys rather than `keyof` their intersection.
 *
 * The comparison is wrapped in tuples on purpose. A naked
 * `boolean extends NonNullable<T[K]>` would also match any property whose type
 * merely *includes* boolean — `children?: VNodeChild` does, since a `VNode`
 * child may be a boolean — and would drag `children` into the cast list.
 */
export type BooleanPropKeys<T> = T extends unknown
  ? {
      [K in keyof T]-?: [NonNullable<T[K]>] extends [boolean] ? K : never;
    }[keyof T]
  : never;

/**
 * Every boolean prop on the exported component catalog.
 *
 * Kept in sync with the prop types by `booleanProps.test-d.ts`, not by
 * discipline: that file asserts set equality in both directions.
 */
export const BOOLEAN_PROP_KEYS = [
  // TextProps
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'inverse',
  'dimColor',
  // Styles, reachable from <Box>
  'borderTop',
  'borderBottom',
  'borderLeft',
  'borderRight',
  'borderDimColor',
  'borderTopDimColor',
  'borderBottomDimColor',
  'borderLeftDimColor',
  'borderRightDimColor',
  // ProgressBarProps
  'showPercent',
] as const satisfies readonly string[];

export type BooleanPropKey = (typeof BOOLEAN_PROP_KEYS)[number];

/**
 * {@link BOOLEAN_PROP_KEYS} as a lookup, so the cast below can walk the props
 * object's own keys instead of reading all sixteen names off it.
 *
 * The direction of that walk matters more than it looks. Vue hands a functional
 * component `shallowReadonly(props)` in a development build — which is what a
 * CLI run under plain Node gets, since nothing sets `NODE_ENV` — so every
 * property read here is a Proxy trap, and a `<Text color>` carrying two props
 * was paying sixteen of them. Measured on the real mount path: **0.118 µs** per
 * component for the sixteen fixed reads against **0.0099 µs** for the own-key
 * scan; `castBooleanProps` and `camelizeProps` together were 6–20 % of the
 * whole synchronous mount. A props object rarely holds more than a handful of
 * keys, and only a key that is *present* can be the empty string.
 *
 * The cost of scanning that way is that the key set now has to be consulted
 * explicitly — the old shape could not mistake a non-boolean prop for a boolean
 * one because it never looked at any other name. `test/template-boolean-props.test.tsx`
 * pins that ("leaves an empty string on a non-boolean prop exactly as it
 * arrived"); every other case in that file stays green without it.
 */
const BOOLEAN_PROP_SET: ReadonlySet<string> = new Set(BOOLEAN_PROP_KEYS);

/**
 * `props` with every boolean prop that arrived as the empty string set to
 * `true` — the cast Vue would have applied had the prop been declared
 * `Boolean`.
 *
 * Only the empty string is touched. An absent prop stays absent (see reason 2
 * above), and any other value is passed through untouched, so `:bold="false"`,
 * `:bold="someRef"` and a plain `bold={true}` all behave exactly as before.
 *
 * Returns `props` itself when there is nothing to cast, which is every JSX
 * render and every template that binds its booleans — the allocation only
 * happens on the path that needs it.
 *
 * Walked with `for...in` over `props`, not over {@link BOOLEAN_PROP_KEYS} — see
 * {@link BOOLEAN_PROP_SET} for why, and `kebabProps.ts`'s `camelizeProps` for
 * the same walk and the same reason it is safe: the only two things that build
 * the object this receives are Vue's `setFullProps` and `mergeProps`, whose
 * keys are always own, enumerable and strings.
 */
export function castBooleanProps<T extends object>(props: T): T {
  let cast: T | undefined;

  for (const key in props) {
    if ((props as Record<string, unknown>)[key] !== '') continue;
    if (!BOOLEAN_PROP_SET.has(key)) continue;

    if (!cast) cast = { ...props };
    (cast as Record<string, unknown>)[key] = true;
  }

  return cast ?? props;
}
