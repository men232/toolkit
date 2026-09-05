<script setup lang="ts">
import { Box, Text } from '@andrew_l/vue-stdout';
import { useLogFeed } from '../composables/useLogFeed.ts';
import { useTuiStore } from '../composables/useTuiStore.ts';
import { LEVEL_COLORS, formatLevel, formatTime } from '../logEntry.ts';
import LogViewHeader from './LogViewHeader.vue';

const store = useTuiStore();
const { selection, filter } = store;
const { entries, scrollLabel } = useLogFeed(store);
</script>

<template>
  <Box
    flexDirection="column"
    :flexGrow="1"
    :flexShrink="1"
    borderStyle="single"
    :paddingX="1"
    overflow="hidden"
  >
    <LogViewHeader
      :selection="selection"
      :filter="filter"
      :scrollLabel="scrollLabel"
    />
    <Box flexDirection="column" :flexGrow="1" :flexShrink="1" overflow="hidden">
      <Text v-for="(entry, index) in entries" :key="index" wrap="wrap"
        ><Text color="gray">{{ `${formatTime(entry.ts)} ` }}</Text
        ><Text :color="LEVEL_COLORS[entry.level]">{{
          formatLevel(entry.level)
        }}</Text
        >{{ ` ${entry.text}` }}</Text
      >
    </Box>
  </Box>
</template>
