import type { LogLevel } from '@andrew_l/toolkit';
import { Box, Text, useStdout } from 'ink';
import type { JSX } from 'react';
import type { ManagedThread } from '../../managedThread.ts';
import { type LogEntry, type TuiStore, passesFilter } from '../store.ts';
import { useStoreSnapshot, useTuiStore } from './useTuiStore.ts';

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'gray',
  log: 'white',
  info: 'cyan',
  warn: 'yellow',
  error: 'red',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

interface NodeInfo {
  appName: string;
  pid?: number;
  pids: number[];
  state?: ManagedThread.State;
  states: ManagedThread.State[];
  processCount: number;
  showProcessTag: boolean;
}

function describeSelection(store: TuiStore): NodeInfo | null {
  if (!store.selectedId) return null;
  for (const app of store.apps) {
    if (app.id === store.selectedId) {
      const threads = app.threads ?? [];
      const pids = Array.from(
        new Set(threads.map(t => t.pid).filter(p => p > 0)),
      );
      return {
        appName: app.name,
        processCount: threads.length,
        pids,
        states: threads.map(v => v.state),
        showProcessTag: threads.length > 1,
      };
    }
    if (app.threads) {
      for (const t of app.threads) {
        if (t.id === store.selectedId) {
          return {
            appName: app.name,
            pid: t.pid,
            pids: t.pid > 0 ? [t.pid] : [],
            state: t.state,
            states: [t.state],
            processCount: app.threads.length,
            showProcessTag: false,
          };
        }
      }
    }
  }
  return null;
}

function formatPids(pids: number[]): string {
  if (pids.length === 0) return '?';
  if (pids.length === 1) return String(pids[0]);
  return pids.join(', ');
}

function gatherEntries(store: TuiStore, info: NodeInfo): LogEntry[] {
  if (!store.selectedId) return [];
  for (const app of store.apps) {
    if (app.id !== store.selectedId) continue;
    if (!app.threads || app.threads.length === 0) {
      return store.getLogs(app.id);
    }
    const merged: LogEntry[] = [];
    for (const t of app.threads) {
      for (const entry of store.getLogs(t.id)) {
        merged.push(
          info.showProcessTag
            ? { ...entry, text: `[${t.pid}] ${entry.text}` }
            : entry,
        );
      }
    }
    merged.sort((a, b) => a.ts - b.ts);
    return merged;
  }
  return store.getLogs(store.selectedId);
}

export function LogView(): JSX.Element {
  useStoreSnapshot();
  const store = useTuiStore();
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;
  const visibleRows = Math.max(1, rows - 5);

  const info = describeSelection(store);
  let entries: LogEntry[] = [];
  let scrollLabel = '';
  if (info) {
    const all = gatherEntries(store, info);
    const filtered = all.filter(e => passesFilter(e, store.filter));
    const total = filtered.length;
    const maxOffset = Math.max(0, total - visibleRows);
    const offset = Math.min(store.logScroll, maxOffset);
    const end = total - offset;
    const start = Math.max(0, end - visibleRows);
    entries = filtered.slice(start, end);
    if (offset > 0) scrollLabel = ` · scrolled +${offset}`;
  }

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      flexShrink={1}
      borderStyle="single"
      paddingX={1}
      overflow="hidden"
    >
      <Box flexShrink={0} flexDirection="column">
        {info ? (
          <Box justifyContent="space-between">
            <Text bold wrap="truncate-end">
              <Text color="cyan">{info.appName}</Text>
              {info.processCount > 1 && info.pid == null ? (
                <Text color="gray"> ({info.processCount} processes)</Text>
              ) : null}
              <Text color="gray">
                {' '}
                · filter: {store.filter}
                {scrollLabel}
              </Text>
            </Text>
            <Text bold wrap="truncate-end">
              <Text color="gray">STATE {info.states.join(', ')}</Text>
              <Text color="gray"> · </Text>
              <Text color="magenta">PID {formatPids(info.pids)}</Text>
            </Text>
          </Box>
        ) : (
          <Text bold>
            <Text color="gray"> (no selection)</Text>
          </Text>
        )}
      </Box>
      <Box flexDirection="column" flexGrow={1} flexShrink={1} overflow="hidden">
        {entries.map((entry, idx) => (
          <Text key={idx} wrap="wrap">
            <Text color="gray">{formatTime(entry.ts)} </Text>
            <Text color={LEVEL_COLORS[entry.level]}>
              {entry.level.toUpperCase().padEnd(5)}
            </Text>{' '}
            {entry.text}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
