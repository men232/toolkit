<script setup lang="ts">
import { Box, Text } from '@andrew_l/vue-stdout';
import { computed } from 'vue';
import type { LevelFilter } from '../logFilter.ts';
import type { SelectionInfo } from '../types.ts';

const props = defineProps<{
  selection: SelectionInfo | null;
  filter: LevelFilter;
  scrollLabel: string;
}>();

const filterLabel = computed(
  () => ` · filter: ${props.filter}${props.scrollLabel}`,
);

const stateLabel = computed(
  () => `STATE ${props.selection?.states.join(', ') ?? ''}`,
);

const pidLabel = computed(() => {
  const pids = props.selection?.pids ?? [];
  if (pids.length === 0) return 'PID ?';
  return `PID ${pids.join(', ')}`;
});

/** Only an app aggregating several threads reports a process count. */
const showProcessCount = computed(
  () =>
    !!props.selection &&
    props.selection.processCount > 1 &&
    props.selection.pid == null,
);
</script>

<template>
  <Box :flexShrink="0" flexDirection="column">
    <Box v-if="selection" justifyContent="space-between"
      ><Text bold wrap="truncate-end"
        ><Text color="cyan">{{ selection.appName }}</Text
        ><Text v-if="showProcessCount" color="gray">
          ({{ selection.processCount }} processes)</Text
        ><Text color="gray">{{ filterLabel }}</Text></Text
      ><Text bold wrap="truncate-end"
        ><Text color="gray">{{ stateLabel }}</Text
        ><Text color="gray"> · </Text
        ><Text color="magenta">{{ pidLabel }}</Text></Text
      ></Box
    >
    <Text v-else bold><Text color="gray"> (no selection)</Text></Text>
  </Box>
</template>
