import { Box, useInput, useStdout } from 'ink';
import type { JSX } from 'react';
import type { TuiStore } from '../store.ts';
import {
  type AppNode,
  type TreeNode,
  flattenVisibleTree,
  getSelectedFilteredCount,
  nextFilter,
} from '../store.ts';
import { AppList } from './AppList.tsx';
import { LogView } from './LogView.tsx';
import { StatusBar } from './StatusBar.tsx';
import { TuiStoreContext, useStoreSnapshot } from './useTuiStore.ts';

interface TuiRootProps {
  store: TuiStore;
  onExit: () => Promise<void>;
}

function findNodeAndApp(
  store: TuiStore,
  id: string,
): { node: TreeNode; app: AppNode } | null {
  for (const app of store.apps) {
    if (app.id === id) return { node: app, app };
    if (app.threads) {
      for (const t of app.threads) {
        if (t.id === id) return { node: t, app };
      }
    }
  }
  return null;
}

function InnerTui({ store, onExit }: TuiRootProps): JSX.Element {
  useStoreSnapshot();
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;

  useInput((input, key) => {
    const visible = flattenVisibleTree(store.apps);
    if (visible.length === 0) return;
    const currentIdx = visible.findIndex(n => n.id === store.selectedId);
    const idx = currentIdx < 0 ? 0 : currentIdx;
    const selected = visible[idx];

    const visibleLogRows = Math.max(1, rows - 5);
    const halfPage = Math.max(1, Math.floor(visibleLogRows / 2));

    if (key.upArrow && key.shift) {
      const maxOffset = Math.max(
        0,
        getSelectedFilteredCount(store) - visibleLogRows,
      );
      store.setLogScroll(Math.min(maxOffset, store.logScroll + halfPage));
      return;
    }
    if (key.downArrow && key.shift) {
      store.setLogScroll(Math.max(0, store.logScroll - halfPage));
      return;
    }
    if (key.home) {
      const total = getSelectedFilteredCount(store);
      store.setLogScroll(Math.max(0, total - visibleLogRows));
      return;
    }
    if (key.end) {
      store.setLogScroll(0);
      return;
    }
    if (key.upArrow) {
      const next = visible[Math.max(0, idx - 1)];
      if (next) store.setSelected(next.id);
      return;
    }
    if (key.downArrow) {
      const next = visible[Math.min(visible.length - 1, idx + 1)];
      if (next) store.setSelected(next.id);
      return;
    }
    if (key.rightArrow) {
      if (
        selected.kind === 'app' &&
        selected.threads &&
        selected.threads.length
      ) {
        if (!selected.expanded) store.toggleExpand(selected.id);
      }
      return;
    }
    if (key.leftArrow) {
      if (selected.kind === 'app' && selected.expanded) {
        store.toggleExpand(selected.id);
      } else if (selected.kind === 'thread') {
        store.setSelected(selected.parentId);
      }
      return;
    }
    if (input === 'f') {
      store.setFilter(nextFilter(store.filter));
      return;
    }
    if (input === 's') {
      const target = findNodeAndApp(store, selected.id);
      if (target) void store.handlers.stop(target.node.id);
      return;
    }
    if (input === 'S') {
      const target = findNodeAndApp(store, selected.id);
      if (target) void store.handlers.start(target.node.id);
      return;
    }
    if (input === 'r') {
      const target = findNodeAndApp(store, selected.id);
      if (target) void store.handlers.restart(target.node.id);
      return;
    }
    if (input === 'q' || (key.ctrl && input === 'c')) {
      void onExit()
      return;
    }
  });

  const columns = stdout?.columns ?? 80;

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Box flexDirection="row" flexGrow={1} width={columns}>
        <AppList />
        <LogView />
      </Box>
      <StatusBar />
    </Box>
  );
}

export function TuiRoot(props: TuiRootProps): JSX.Element {
  return (
    <TuiStoreContext.Provider value={props.store}>
      <InnerTui {...props} />
    </TuiStoreContext.Provider>
  );
}
