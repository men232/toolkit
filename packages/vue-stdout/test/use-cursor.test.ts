import ansiEscapes from 'ansi-escapes';
import { computed, defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/createApp';
import { useCursor } from '../src/hooks/useCursor';
import { createStdout } from './helpers/create-stdout';

const ESC = String.fromCharCode(27);
const showCursorEscape = `${ESC}[?25h`;

const box = (props: any, ...kids: any[]) => h('stdout-box', props, kids);
const span = (props: any, ...kids: any[]) => h('stdout-text', props, kids);

const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

/**
 * Hook-level tests for `useCursor`, on top of the byte-level Container
 * tests in `test/container.test.ts` (which cover `onFrame`/`onStatic`'s
 * escape-sequence math directly). What's asserted here is specifically
 * `useCursor`'s own contract: that its `setCursorPosition` reaches the real
 * `Container` behind a full `render()` tree, and that it's cleared again on
 * unmount -- the two things `useCursor.ts` itself is responsible for, as
 * opposed to `Container`'s arithmetic.
 */
describe('useCursor', () => {
  it('places the cursor at the position set during setup(), from the very first frame', async () => {
    const stdout = createStdout(20);

    const app = createApp({
      setup() {
        const { setCursorPosition } = useCursor();
        setCursorPosition({ x: 1, y: 0 });
        return () => box({}, span({}, 'ab'));
      },
    });
    app.mount({ stdout });

    await flush();

    expect(stdout.get().endsWith(ansiEscapes.cursorTo(1) + showCursorEscape)).toBe(true);

    app.unmount();
  });

  it('does not append any cursor escape sequence when useCursor is never called', async () => {
    const stdout = createStdout(20);

    const app = createApp({ render: () => box({}, span({}, 'ab')) });
    app.mount({ stdout });

    await flush();

    expect(stdout.get()).not.toContain(showCursorEscape);

    app.unmount();
  });

  it('clears the position on unmount: a later frame from a sibling no longer shows it', async () => {
    const stdout = createStdout(20);
    const showCursorChild = ref(true);

    const CursorChild = defineComponent({
      setup() {
        const { setCursorPosition } = useCursor();
        setCursorPosition({ x: 0, y: 0 });
        return () => span({}, 'c');
      },
    });

    // `maxFps: 0` (unlimited): this test asserts on the
    // frame right after the reactive change settles, with no real time
    // elapsed -- the default `maxFps: 30` throttle would otherwise coalesce
    // that write away and leave the stale, cursor-showing frame on screen.
    const app = createApp({
      setup() {
        return () =>
          box({}, [showCursorChild.value ? h(CursorChild) : null, span({}, 'd')]);
      },
    });
    app.mount({ stdout, maxFps: 0 });

    await flush();
    expect(stdout.get()).toContain(showCursorEscape);

    showCursorChild.value = false;
    await nextTick();
    await flush();

    expect(stdout.get()).not.toContain(showCursorEscape);

    app.unmount();
  });

  // Without this, `app.unmount()` after an
  // active cursor position had actually been painted onto a real frame left
  // the terminal cursor hidden and parked wherever that frame had put it --
  // the shell prompt would then print on top of the app's last output
  // instead of below it. Fixed in `Container.destroy()`; see
  // `test/container.test.ts`'s "Container cursor teardown" suite for the
  // byte-level assertion this is the hook-level counterpart of.
  it('restores the cursor to the bottom line and shows it again when unmount() tears the app down', async () => {
    const stdout = createStdout(20);

    const app = createApp({
      setup() {
        const { setCursorPosition } = useCursor();
        setCursorPosition({ x: 1, y: 0 });
        return () => box({}, span({}, 'ab'));
      },
    });
    app.mount({ stdout });

    await flush();
    const writesBeforeUnmount = stdout.getWrites().length;

    app.unmount();

    const writesSinceUnmount = stdout.getWrites().slice(writesBeforeUnmount);
    expect(writesSinceUnmount.some(write => write.endsWith(showCursorEscape))).toBe(true);
  });

  // A throttled trailing frame at
  // unmount left the cursor hidden forever. Default `maxFps: 30` (NOT
  // overridden to `0` here -- that's precisely what hid this from every
  // other test in this file): frame 1 commits on the leading edge and
  // shows the cursor; frame 2, produced inside the same ~33ms throttle
  // window, is deferred by the throttle rather than computed and written
  // immediately. `app.unmount()` then runs `useCursor`'s `onScopeDispose`
  // (clearing the cursor position) *before* teardown flushes that owed
  // frame -- so the flush's own `onFrame` sees `cursorPosition`
  // already `undefined`, hides the cursor on the way in
  // (`returnCursorToBottomIfShown`), and has nothing left to show it again
  // with. Without the fix, the process exits with the real terminal cursor
  // invisible for the rest of the shell session.
  it('leaves the cursor shown after a throttled trailing frame at unmount', async () => {
    const stdout = createStdout(20);
    const text = ref('a');

    const app = createApp({
      setup() {
        const { setCursorPosition } = useCursor();
        setCursorPosition({ x: 1, y: 0 });
        return () => box({}, span({}, text.value));
      },
    });
    app.mount({ stdout });

    await flush();
    expect(stdout.get()).toContain(showCursorEscape);

    // Change content and let it reach the Renderer -- but with no real time
    // elapsed, well inside the default throttle window, so the pass is
    // deferred instead of run.
    text.value = 'ab';
    await nextTick();
    await flush();

    app.unmount();

    const allOutput = stdout.getWrites().join('');
    const lastHide = allOutput.lastIndexOf(`${ESC}[?25l`);
    const lastShow = allOutput.lastIndexOf(showCursorEscape);

    // The final cursor-visibility escape sequence written must be a show,
    // not a hide -- i.e. nothing after the last show sequence hides the
    // cursor again without a later show to undo it.
    expect(lastShow).toBeGreaterThan(lastHide);
  });

  // A caret derived from reactive state is the whole
  // point of the IME use case this hook documents. Before this, the consumer
  // had to hand-write the `watchEffect` -- the composable is the natural
  // owner of it, exactly as `useFocus`/`useInput` own their `isActive`
  // watcher.
  it('tracks a reactive position source, from the first frame onward', async () => {
    const stdout = createStdout(20);
    const text = ref('ab');
    const caret = computed(() => ({ x: text.value.length, y: 0 }));

    const app = createApp({
      setup() {
        useCursor(caret);
        return () => box({}, span({}, text.value));
      },
    });
    app.mount({ stdout, maxFps: 0 });

    await flush();
    expect(
      stdout.get().endsWith(ansiEscapes.cursorTo(2) + showCursorEscape),
    ).toBe(true);

    text.value = 'abc';
    await nextTick();
    await flush();

    expect(
      stdout.get().endsWith(ansiEscapes.cursorTo(3) + showCursorEscape),
    ).toBe(true);

    app.unmount();
  });

  // `Container.cursorPosition` is a single
  // last-write-wins slot, so an unconditional clear on unmount let the
  // *first* component to go away hide a cursor a still-mounted sibling was
  // positioning -- with nothing to restore it.
  it('does not clear the cursor when a consumer that is not the last writer unmounts', async () => {
    const stdout = createStdout(20);
    const showFirst = ref(true);

    const First = defineComponent({
      setup() {
        const { setCursorPosition } = useCursor();
        setCursorPosition({ x: 0, y: 0 });
        return () => span({}, 'a');
      },
    });

    const Second = defineComponent({
      setup() {
        const { setCursorPosition } = useCursor();
        setCursorPosition({ x: 1, y: 0 });
        return () => span({}, 'b');
      },
    });

    const app = createApp({
      setup() {
        // `First` mounts before `Second`, so `Second` is the last writer
        // and owns what is on screen.
        return () =>
          box({}, [showFirst.value ? h(First) : null, h(Second)]);
      },
    });
    app.mount({ stdout, maxFps: 0 });

    await flush();
    expect(stdout.get()).toContain(showCursorEscape);

    showFirst.value = false;
    await nextTick();
    await flush();

    // `Second` is still mounted and still positioning the cursor; `First`
    // going away must not hide it.
    expect(stdout.get()).toContain(showCursorEscape);
    expect(
      stdout.get().endsWith(ansiEscapes.cursorTo(1) + showCursorEscape),
    ).toBe(true);

    app.unmount();
  });
});
