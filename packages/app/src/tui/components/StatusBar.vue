<script setup lang="ts">
import { Box, Text } from '@andrew_l/vue-stdout';
import { useTuiStore } from '../composables/useTuiStore.ts';

const { system } = useTuiStore();
</script>

<template>
  <Box
    flexDirection="row"
    justifyContent="space-between"
    :paddingX="1"
    :flexShrink="0"
    :height="1"
  >
    <Box :flexShrink="1" overflow="hidden">
      <Text wrap="truncate-end">
        <template v-if="system">
          <Text color="gray">[system] </Text>
          <Text :color="system.level === 'error' ? 'red' : 'white'">{{
            system.text
          }}</Text>
        </template>
        <Text v-else color="gray">[system] ready</Text>
      </Text>
    </Box>
    <Box :flexShrink="0">
      <Text color="gray">↑/↓ · →/← · PgUp/PgDn · s · ⇧S · r · f · q</Text>
    </Box>
  </Box>
</template>
