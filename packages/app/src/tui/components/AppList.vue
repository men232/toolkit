<script setup lang="ts">
import { Box, Text } from '@andrew_l/vue-stdout';
import { computed } from 'vue';
import type { ManagedThread } from '../../managedThread.ts';
import { useAppListWidth } from '../composables/useAppListWidth.ts';
import { useTuiStore } from '../composables/useTuiStore.ts';

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

const store = useTuiStore();
const width = useAppListWidth(store);

/**
 * Rows are built here rather than in the template, and rendered inline rather
 * than through a row component: this list repaints on every frame, so it is a
 * hot path where one component instance per row buys nothing.
 */
const rows = computed(() =>
  store.visibleNodes.value.map(node => ({
    id: node.id,
    name: node.name,
    selected: node.id === store.selectedId.value,
    color: STATE_COLORS[node.state],
    // An app that can expand shows a caret; a thread is indented under it.
    caret:
      node.kind === 'app' && node.threads?.length
        ? node.expanded
          ? '▾ '
          : '▸ '
        : '  ',
  })),
);
</script>

<template>
  <Box
    flexDirection="column"
    :width="width"
    :flexShrink="0"
    borderStyle="single"
    :paddingX="1"
    overflow="hidden"
  >
    <Text bold>Apps</Text>
    <Text
      v-for="row in rows"
      :key="row.id"
      wrap="truncate-end"
      :bold="row.selected"
      ><Text color="cyan">{{ row.selected ? '▌' : ' ' }}</Text
      >{{ row.caret }}<Text :color="row.color">●</Text
      >{{ ` ${row.name}` }}</Text
    >
  </Box>
</template>
