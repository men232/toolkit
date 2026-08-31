// Type-level counterpart to `test/focus.test.ts` / `test/use-focus.test.ts`,
// run by `vitest --typecheck` (never executed at runtime -- the calls below
// would throw for want of a mounted app context, which is exactly why this
// lives in a `.test-d.ts` file). It pins the two halves of the focus
// composables' *type* contract that no runtime test can express:
//
//  - the refs whose writes would be silent no-ops are read-only, so writing
//    to them is a compile error rather than a mutation of a local mirror
//    that moves no focus and is reverted by the next change;
//  - the refs that stay writable really are writable, and the read-only ones
//    still satisfy `MaybeRefOrGetter<T>` so the README's
//    `useInput(handler, { isActive: isFocused })` idiom keeps compiling.
import { expectTypeOf, test } from 'vitest';
import type { MaybeRefOrGetter } from 'vue';
import { useFocus } from '../src/hooks/useFocus';
import { useFocusManager } from '../src/hooks/useFocusManager';
import { useInput } from '../src/hooks/useInput';

test('useFocus().isFocused is a read-only ref that still feeds useInput isActive', () => {
  const { isFocused } = useFocus();

  expectTypeOf(isFocused.value).toEqualTypeOf<boolean>();

  // @ts-expect-error `isFocused` is derived from the shared `FocusManager`;
  // writing to it would move no focus. `focus(id)` is the write path.
  isFocused.value = true;

  // The README idiom (`README.md`, "Handling Input & Focus"): a read-only
  // ref is still a `MaybeRefOrGetter<boolean>`, so this must keep compiling.
  const isActive: MaybeRefOrGetter<boolean> = isFocused;
  useInput(() => {}, { isActive });
  useInput(() => {}, { isActive: isFocused });
});

test('useFocusManager(): activeId is read-only, isFocusEnabled is writable', () => {
  const { activeId, isFocusEnabled } = useFocusManager();

  expectTypeOf(activeId.value).toEqualTypeOf<string | undefined>();
  expectTypeOf(isFocusEnabled.value).toEqualTypeOf<boolean>();

  // @ts-expect-error `focus(id)` is documented to no-op for an unregistered
  // id, so a writable `activeId` would silently reject writes and read back
  // the old value. The method is the write path.
  activeId.value = 'a';

  // ...whereas `isFocusEnabled` genuinely is the write path: it replaced the
  // `enableFocus()`/`disableFocus()` pair outright.
  isFocusEnabled.value = false;
  isFocusEnabled.value = true;
});
