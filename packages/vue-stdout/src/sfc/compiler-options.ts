/**
 * Host tags the stdout renderer understands natively — this package's private
 * equivalent of ink's `ink-box`/`ink-text` and vue-tui's `tui-box`/`tui-text`.
 *
 * **Not public API.** Nothing here is exported from the package or from
 * `/vite`; the authoring surface is `<Box>`, `<Text>` and the rest of
 * `src/components`, which compile down to these. Two properties come from the
 * `stdout-` prefix, and both are the reason it exists: the names are valid
 * custom elements (hyphenated, so no template ever needs them spelled out in
 * an `isCustomElement` a consumer has to configure), and they cannot collide
 * with a real HTML tag. The set used to include `span`, `b` and `a`, which
 * meant augmenting Vue's JSX typing for three tags every consumer's program
 * also uses.
 *
 * Both tags are unknown to Vue, so any compiler that meets them still has to
 * be told they are elements or it emits `resolveComponent()` calls that warn
 * at runtime. That is now a purely internal concern — `build.config.ts` (which
 * compiles `NewLine.tsx`, the last `.tsx` in `src/` that writes a host tag as
 * JSX; `Box.tsx` and `Text.tsx` call `h()` instead, for a reason unrelated to
 * this one), `vite.config.ts` and `src/sfc/hook.ts`.
 *
 * Kept a superset of the layout engine's `INLINE_ELEMENT_TAGS`
 * (`../tree/layout.ts`), which `compiler-options.test.ts` enforces.
 */
export const INTRINSIC_TAGS: ReadonlySet<string> = new Set([
  'stdout-box',
  'stdout-text',
]);

export function isCustomElement(tag: string): boolean {
  return INTRINSIC_TAGS.has(tag);
}

export const compilerOptions = { isCustomElement };
