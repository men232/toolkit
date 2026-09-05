import { type FunctionalComponent, type VNodeChild, h } from 'vue';

export interface TransformProps {
  /**
   * Function that transforms the squashed string output of `children`. It
   * accepts the finished text of the whole subtree — not one text node at a
   * time — and must return the replacement string. Note that when children
   * use `<Text>` styling props (e.g. `color`, `bold`), the string it
   * receives already contains ANSI escape codes.
   */
  readonly transform: (output: string, index: number) => string;

  readonly children?: VNodeChild;
}

/**
 * Transform a string representation of its subtree before it is written to
 * output. Useful for gradients, links, or other text effects that need the
 * *finished* string rather than individual `<Text>` nodes.
 *
 * Ported from ink's `<Transform>`, which hangs the transform off an `ink-text`
 * node and applies it once the subtree is squashed into one string. This does
 * the same by setting `internalTransform` on a `<stdout-text>` (this package's
 * inline-text tag), which `textTransformers` folds into the same transformer
 * list `squashText.ts` and `render.ts#paintText` already apply to every other
 * inline element — no parallel text pipeline needed.
 *
 * `transform`'s second argument is the index of the *line* within a multi-line
 * result, exactly like ink — it is `Layer.write`'s own line index, not a
 * position within `children`.
 */
export const Transform: FunctionalComponent<TransformProps> = (
  props,
  { slots },
) => {
  if (slots.default == null) return null;

  // `h()` rather than JSX `<stdout-text>`: JSX would compile fine, but `h()`
  // keeps `internalTransform` -- not a real DOM attribute, nor part of
  // `TextProps` -- from being spread onto anything by accident. It also passes
  // the slot's children straight through instead of nesting them in an array,
  // which is what `Box.tsx` and `Text.tsx` had to drop JSX to do.
  return h(
    'stdout-text',
    { internalTransform: props.transform },
    slots.default(),
  );
};

Transform.displayName = 'Transform';
