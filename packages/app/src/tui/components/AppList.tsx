import { Box, Text } from 'ink';
import type { JSX } from 'react';
import type { ManagedThread } from '../../managedThread.ts';
import { type AppNode, flattenVisibleTree } from '../store.ts';
import { useStoreSnapshot, useTuiStore } from './useTuiStore.ts';

const STATE_COLORS: Record<ManagedThread.State, string> = {
  'in-run': 'yellow',
  run: 'green',
  'in-stop': 'yellow',
  'in-setup': 'yellow',
  setup: 'yellow',
  ready: 'gray',
  'in-shutdown': 'yellow',
  init: 'gray',
  shutdown: 'gray',
  stop: 'gray',
  error: 'red',
};

function isApp(n: { kind: string }): n is AppNode {
  return n.kind === 'app';
}

function rowLength(n: { kind: string; name?: string; pid?: number }): number {
  // marker + caret/space + space + bullet + space + label
  if (n.kind === 'app') return 1 + 1 + 1 + 1 + 1 + (n.name?.length ?? 0);
  return 1 + 2 + 1 + 1 + `PID ${n.pid}`.length;
}

export function AppList(): JSX.Element {
  useStoreSnapshot();
  const store = useTuiStore();
  const nodes = flattenVisibleTree(store.apps);
  const maxRow = nodes.reduce(
    (m, n) => Math.max(m, rowLength(n)),
    'Apps'.length,
  );
  // border (2) + paddingX (2)
  const width = maxRow + 4;

  return (
    <Box
      flexDirection="column"
      width={width}
      flexShrink={0}
      borderStyle="single"
      paddingX={1}
      overflow="hidden"
    >
      <Text bold>Apps</Text>
      {nodes.map(node => {
        const selected = node.id === store.selectedId;
        const color = STATE_COLORS[node.state];
        const marker = selected ? '▌' : ' ';
        if (isApp(node)) {
          const caret =
            node.threads && node.threads.length
              ? node.expanded
                ? '▾'
                : '▸'
              : ' ';
          return (
            <Text key={node.id} wrap="truncate-end" bold={selected}>
              <Text color="cyan">{marker}</Text>
              {caret} <Text color={color}>●</Text> {node.name}
            </Text>
          );
        }
        return (
          <Text key={node.id} wrap="truncate-end" bold={selected}>
            <Text color="cyan">{marker}</Text>
            {'  '}
            <Text color={color}>●</Text> {node.name}
          </Text>
        );
      })}
    </Box>
  );
}
