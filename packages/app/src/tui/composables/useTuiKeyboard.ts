import { useInput } from '@andrew_l/vue-stdout';
import { nextFilter } from '../logFilter.ts';
import type { TuiStore } from '../store.ts';
import { useLogFeed } from './useLogFeed.ts';
import { useLogViewport } from './useLogViewport.ts';

export interface UseTuiKeyboardOptions {
  /** Invoked on `q` / Ctrl+C, to start the graceful shutdown. */
  onExit: () => void;
}

/**
 * Every key binding the TUI has: tree navigation, log scrolling, the level
 * filter, and the per-node lifecycle actions.
 *
 * Takes the store as a parameter for the reason spelled out in `useLogFeed`.
 */
export function useTuiKeyboard(
  store: TuiStore,
  { onExit }: UseTuiKeyboardOptions,
): void {
  const { visibleRows } = useLogViewport();
  const { maxScroll } = useLogFeed(store);

  /**
   * Fire a lifecycle handler and contain any rejection by logging it to the
   * target node, so a failed stop/start/restart can never crash the TUI with
   * an unhandled rejection.
   */
  const runNodeAction = (
    nodeId: string,
    handler: (id: string) => Promise<void>,
  ): void => {
    handler(nodeId).catch(error => {
      store.pushLog(nodeId, {
        ts: Date.now(),
        level: 'error',
        text: `Action failed: ${String((error && error.message) || error)}`,
      });
    });
  };

  useInput((input, key) => {
    const visible = store.visibleNodes.value;
    if (visible.length === 0) return;

    const currentIndex = visible.findIndex(n => n.id === store.selectedId.value);
    const index = currentIndex < 0 ? 0 : currentIndex;
    const selected = visible[index];
    const halfPage = Math.max(1, Math.floor(visibleRows.value / 2));

    if (key.upArrow && key.shift) {
      store.logScroll.value = Math.min(
        maxScroll.value,
        store.logScroll.value + halfPage,
      );
      return;
    }
    if (key.downArrow && key.shift) {
      store.logScroll.value -= halfPage;
      return;
    }
    if (key.home) {
      store.logScroll.value = maxScroll.value;
      return;
    }
    if (key.end) {
      store.logScroll.value = 0;
      return;
    }
    if (key.upArrow) {
      store.selectedId.value = visible[Math.max(0, index - 1)].id;
      return;
    }
    if (key.downArrow) {
      store.selectedId.value =
        visible[Math.min(visible.length - 1, index + 1)].id;
      return;
    }
    if (key.rightArrow) {
      if (selected.kind === 'app' && selected.threads?.length) {
        selected.expanded = true;
      }
      return;
    }
    if (key.leftArrow) {
      if (selected.kind === 'app' && selected.expanded) {
        selected.expanded = false;
      } else if (selected.kind === 'thread') {
        store.selectedId.value = selected.parentId;
      }
      return;
    }
    if (input === 'f') {
      store.filter.value = nextFilter(store.filter.value);
      return;
    }
    if (input === 's') {
      runNodeAction(selected.id, store.handlers.stop);
      return;
    }
    if (input === 'S') {
      runNodeAction(selected.id, store.handlers.start);
      return;
    }
    if (input === 'r') {
      runNodeAction(selected.id, store.handlers.restart);
      return;
    }
    if (input === 'q' || (key.ctrl && input === 'c')) {
      onExit();
    }
  });
}
