import { defineComponent, h, onErrorCaptured, ref, type VNodeChild } from 'vue';
import { Box } from './Box';
import { Text } from './Text';

/**
 * The caught error is reported as the `error` **emit**, not as a callback prop
 * (`onError` is a React idiom). This package ships a first-class SFC pipeline,
 * so templates are a real consumer, and only a declared emit gives them the
 * v-on modifiers -- `@error.once` compiles to an `onErrorOnce` prop a
 * hand-read callback never sees. JSX `onError={fn}` keeps working, because Vue
 * routes `onXxx` props to emit listeners.
 */
// A type alias rather than an interface: `defineComponent`'s emits parameter
// is constrained to `ObjectEmitsOptions`, which carries a string index
// signature -- an interface has no implicit index signature and fails that
// constraint, an object type alias satisfies it.
export type ErrorBoundaryEmits = {
  /** Emitted once, synchronously, when a descendant throws during render. */
  error: (error: Error) => void;
};

export interface ErrorBoundaryProps {
  /**
   * JSX form of the `error` emit -- Vue routes an `onXxx` prop to the emit
   * listener of the same name, so `<ErrorBoundary onError={fn}>` and a
   * template's `<ErrorBoundary @error="fn">` are the same listener.
   */
  onError?: (error: Error) => void;
  /**
   * Declared for the same reason `BoxAttributes.children` is (`src/jsx.ts`):
   * without it, `<ErrorBoundary>…</ErrorBoundary>` with literal JSX children
   * -- the idiomatic way to write it -- does not type-check.
   */
  children?: VNodeChild;
}

/**
 * Render the caught error in place of the subtree that threw: a red "ERROR"
 * label, the message, and the stack trace (one line per frame). Deliberately
 * lighter than ink's `ErrorOverview`, which also shells out to
 * `stack-utils`/`code-excerpt` to resolve each frame to a file and print a
 * source excerpt -- neither is a dependency of this package. Every stack line
 * is rendered the way ink's own fallback branch renders a frame it could not
 * resolve: dim, bold, prefixed with "- ".
 *
 * @internal
 */
function renderError(error: Error): VNodeChild {
  const stackLines = error.stack ? error.stack.split('\n').slice(1) : [];

  return h(Box, { flexDirection: 'column', padding: 1 }, () => [
    h(Box, {}, () => [
      h(Text, { backgroundColor: 'red', color: 'white' }, () => ' ERROR '),
      h(Text, {}, () => ` ${error.message}`),
    ]),

    stackLines.length > 0
      ? h(Box, { marginTop: 1, flexDirection: 'column' }, () =>
          stackLines.map((line, index) =>
            h(Box, { key: `${index}-${line}` }, () => [
              h(Text, { dimColor: true }, () => '- '),
              h(Text, { dimColor: true, bold: true }, () => line.trim()),
            ]),
          ),
        )
      : null,
  ]);
}

/**
 * Vue's equivalent of ink's `ErrorBoundary`: a descendant throwing during
 * render must not tear down the whole app. React gets this from
 * `getDerivedStateFromError`/`componentDidCatch`, class components only;
 * Vue's `onErrorCaptured` needs a `setup()`, which rules out a plain
 * `FunctionalComponent` here (unlike `Box`/`Text`/`Static`).
 *
 * Written with `h()` in a `.ts` file rather than as `.tsx`. The original
 * reason was defensive — `@vitejs/plugin-vue-jsx` transforms `/\.[jt]sx$/`
 * and that transform was what injected the SSR wrapper breaking any mounted
 * `defineComponent`, so staying outside its filter sidestepped the problem.
 * That reason is gone: this package compiles with `unplugin-vue-jsx`, which
 * has no SSR code path. The file stays `.ts` because nothing now requires it
 * to change, not because the hazard still exists.
 *
 * Renders its default slot until a descendant throws; from then on renders the
 * caught error instead (see `renderError`) and never renders the slot again
 * for this instance's lifetime -- same as ink, which does not attempt to
 * recover after an error.
 */
export const ErrorBoundary = defineComponent<
  ErrorBoundaryProps,
  ErrorBoundaryEmits
>(
  (_props, { slots, emit }) => {
    const error = ref<Error | undefined>(undefined);

    onErrorCaptured(caught => {
      const normalized =
        caught instanceof Error ? caught : new Error(String(caught));

      error.value = normalized;
      emit('error', normalized);

      // Stop the error from propagating further up the component tree (to an
      // ancestor `onErrorCaptured`, or Vue's own unhandled-error reporting)
      // now that it has been caught and will be rendered here instead.
      return false;
    });

    return () => {
      if (error.value) {
        return renderError(error.value);
      }

      return slots.default?.() ?? null;
    };
  },
  {
    name: 'ErrorBoundary',
    // Empty, deliberately: declaring `onError` as a prop would take it out
    // of the emit path and `emit('error')` would never reach it.
    props: [],
    emits: ['error'],
  },
);
