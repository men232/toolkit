<script setup lang="ts">
/**
 * One focusable list. Tab/Shift+Tab (handled globally by the app itself)
 * move focus onto and off of it; while it holds focus, its own `useInput` --
 * gated on `isFocused` via `isActive` -- moves the selection within it. So
 * arrow keys only ever affect the list Tab last landed on.
 */
import { ref } from 'vue';
import { Box, Text, useFocus, useInput } from '../../src';

defineOptions({ name: 'SelectList' });

const props = defineProps<{
  id: string;
  title: string;
  items: string[];
  autoFocus?: boolean;
}>();

const { isFocused } = useFocus({ id: props.id, autoFocus: props.autoFocus });
const selectedIndex = ref(0);

useInput(
  (_input, key) => {
    if (key.upArrow) {
      selectedIndex.value =
        (selectedIndex.value - 1 + props.items.length) % props.items.length;
    } else if (key.downArrow) {
      selectedIndex.value = (selectedIndex.value + 1) % props.items.length;
    }
  },
  { isActive: isFocused },
);
</script>

<template>
  <Box
    flexDirection="column"
    borderStyle="round"
    :borderColor="isFocused ? 'cyan' : 'gray'"
    :paddingX="1"
    :marginRight="1"
  >
    <Text :bold="true" :underline="isFocused">{{ title }}</Text>

    <Box v-for="(item, index) in items" :key="item">
      <!-- Two adjacent interpolations, not one concatenation: the cursor and
           the label are separate children in the JSX this replaced, and the
           two must paint the same bytes. -->
      <Text
        :color="index === selectedIndex ? 'cyan' : undefined"
        :inverse="index === selectedIndex"
        >{{ index === selectedIndex ? '❯ ' : '  ' }}{{ item }}</Text
      >
    </Box>
  </Box>
</template>
