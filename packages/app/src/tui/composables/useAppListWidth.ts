import { type ComputedRef, computed } from 'vue';
import type { TuiStore } from '../store.ts';

/** Border (2) plus `paddingX` (2), the chrome around an app row's label. */
const APP_LIST_CHROME = 4;

/**
 * How wide the app list renders.
 *
 * Shared rather than local to `AppList` because the log panel gets whatever
 * columns are left over, and `useLogFeed` has to know that number to budget its
 * feed by rows. Deriving it in both places from the same rule is what keeps the
 * two from disagreeing.
 */
export function useAppListWidth(store: TuiStore): ComputedRef<number> {
  return computed(() => {
    const widest = store.visibleNodes.value.reduce(
      // marker + caret/indent (2) + bullet + space + label
      (max, node) => Math.max(max, 1 + 2 + 1 + 1 + node.name.length),
      'Apps'.length,
    );

    return widest + APP_LIST_CHROME;
  });
}
