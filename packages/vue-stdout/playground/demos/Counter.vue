<script setup lang="ts">
/**
 * The smallest thing that proves a reactive update reaches the terminal: one
 * counter, driven by the keyboard, read from three places in the template.
 * Kept deliberately minimal so it can serve as the check for "did the frame
 * update without losing state".
 */
import { computed, ref } from 'vue';
import { Box, Text, useInput } from '../../src';

defineOptions({ name: 'CounterDemo' });

const count = ref(0);
const rows = computed(() => Array.from({ length: 5 }, (_, i) => i + 1));

useInput((input, key) => {
  if (key.rightArrow || input === '+') count.value += 1;
  if (key.leftArrow || input === '-') count.value -= 1;
});
</script>

<template>
  <Box flexDirection="column" borderStyle="round" :paddingX="1">
    <Text :bold="true">A counter, in a template</Text>

    <Box :marginTop="1">
      <!-- A bare `dimColor` would paint the same thing: the empty string a
           template compiles a bare attribute to is cast back to `true` in
           `src/components/booleanProps.ts`. Kept bound because the hint text
           beside it reads better with the two props written the same way. -->
      <Text :dimColor="true">← / → or + / − to change the count · </Text>
      <Text color="cyan">{{ count }}</Text>
    </Box>

    <Box flexDirection="column" :marginTop="1">
      <Box v-for="n in rows" :key="n">
        <Text :color="n <= count ? 'green' : 'gray'">
          {{ n <= count ? '●' : '○' }} row {{ n }}
        </Text>
      </Box>
    </Box>
  </Box>
</template>
