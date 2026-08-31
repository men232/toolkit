<script setup lang="ts">
import { computed, ref } from 'vue';
import { Box, Text, useApp, useInput } from '@andrew_l/vue-stdout';

const { exit } = useApp();

const items = ['Fetch', 'Build', 'Test', 'Publish'];
const index = ref(0);
const checked = ref<Set<number>>(new Set());

const summary = computed(() =>
  checked.value.size === items.length
    ? 'all done'
    : `${checked.value.size} of ${items.length}`,
);

useInput((input, key) => {
  if (key.upArrow) index.value = (index.value - 1 + items.length) % items.length;
  if (key.downArrow) index.value = (index.value + 1) % items.length;

  if (input === ' ') {
    const next = new Set(checked.value);
    next.has(index.value) ? next.delete(index.value) : next.add(index.value);
    checked.value = next;
  }

  if (input === 'q') exit();
});
</script>

<template>
  <Box flexDirection="column" borderStyle="round" :paddingX="1">
    <Text :bold="true">Release checklist</Text>

    <Box flexDirection="column" :marginTop="1">
      <Box v-for="(item, i) in items" :key="item">
        <Text :color="i === index ? 'cyan' : undefined">
          {{ i === index ? '❯ ' : '  ' }}{{ checked.has(i) ? '[x]' : '[ ]' }}
          {{ item }}
        </Text>
      </Box>
    </Box>

    <Box :marginTop="1">
      <Text dimColor>space toggles · q quits · </Text>
      <Text color="green">{{ summary }}</Text>
    </Box>
  </Box>
</template>
