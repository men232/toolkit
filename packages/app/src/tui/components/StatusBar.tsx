import { Box, Text } from 'ink';
import type { JSX } from 'react';
import { useStoreSnapshot, useTuiStore } from './useTuiStore.ts';

export function StatusBar(): JSX.Element {
  useStoreSnapshot();
  const store = useTuiStore();
  const sys = store.system;

  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      paddingX={1}
      flexShrink={0}
      height={1}
    >
      <Box flexShrink={1} overflow="hidden">
        <Text wrap="truncate-end">
          {sys ? (
            <>
              <Text color="gray">[system] </Text>
              <Text color={sys.level === 'error' ? 'red' : 'white'}>
                {sys.text}
              </Text>
            </>
          ) : (
            <Text color="gray">[system] ready</Text>
          )}
        </Text>
      </Box>
      <Box flexShrink={0}>
        <Text color="gray">
          ↑/↓ · →/← · PgUp/PgDn · s · ⇧S · r · f · q
        </Text>
      </Box>
    </Box>
  );
}
