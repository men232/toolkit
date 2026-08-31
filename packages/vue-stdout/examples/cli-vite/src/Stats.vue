<script setup lang="ts">
import { Box, Text } from '@andrew_l/vue-stdout';
import { computed } from 'vue';

const props = defineProps<{ done: number; total: number }>();

const percent = computed(() =>
  props.total === 0 ? 0 : Math.round((props.done / props.total) * 100),
);
</script>

<template>
  <Box borderStyle="round" :paddingX="1" flexDirection="column">
    <Text :bold="true">Stats (a .vue component)</Text>
    <Box :marginTop="1">
      <Text dimColor>completed </Text>
      <Text color="green">{{ done }}</Text>
      <Text dimColor> / {{ total }} · </Text>
      <Text :color="percent === 100 ? 'cyan' : 'yellow'">{{ percent }}%</Text>
    </Box>
  </Box>
</template>
