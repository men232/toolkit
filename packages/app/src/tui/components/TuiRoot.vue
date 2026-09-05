<script setup lang="ts">
import { Box } from '@andrew_l/vue-stdout';
import { useLogViewport } from '../composables/useLogViewport.ts';
import { useTuiKeyboard } from '../composables/useTuiKeyboard.ts';
import { provideTuiStore } from '../composables/useTuiStore.ts';
import type { TuiStore } from '../store.ts';
import AppList from './AppList.vue';
import LogView from './LogView.vue';
import StatusBar from './StatusBar.vue';

const props = defineProps<{
  store: TuiStore;
}>();

const emit = defineEmits<{ exit: [] }>();

provideTuiStore(props.store);

const { columns, rows } = useLogViewport();

useTuiKeyboard(props.store, {
  onExit: () => {
    emit('exit');
  },
});
</script>

<template>
  <Box flexDirection="column" :width="columns" :height="rows">
    <!--
      `flexShrink` is not optional here. Yoga defaults it to 0 (CSS defaults it
      to 1), so without it this row keeps its content height: a log line long
      enough to wrap makes the panel taller than the space left over, the row
      refuses to give any of it back, and the status bar below is pushed out of
      the root's fixed `height` and off the frame entirely. The log panel is
      what should be clipped when there is not enough room, never the status
      bar. `src/tui/tuiLayout.test.ts` holds this.
    -->
    <Box flexDirection="row" :flexGrow="1" :flexShrink="1" :width="columns">
      <AppList />
      <LogView />
    </Box>
    <StatusBar />
  </Box>
</template>
