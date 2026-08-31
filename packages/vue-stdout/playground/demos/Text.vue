<script setup lang="ts">
import { ref } from 'vue';
import { Box, Text, Transform, useInput } from '../../src';

defineOptions({ name: 'TextDemo' });

const SENTENCE =
  'The quick brown fox jumps over the lazy dog and keeps on running.';

const WRAP_MODES = [
  'wrap',
  'end',
  'middle',
  'truncate-end',
  'truncate-middle',
  'truncate-start',
] as const;

// The demo used to be a static picture, which made it useless as a rig for
// checking that an update reaches the terminal at all. `selected` is the
// smallest honest state it can carry: the six wrap modes are meant to be
// compared against each other, so a cursor that highlights one of them is
// something the screen wanted anyway.
const selected = ref(0);

useInput((_input, key) => {
  if (key.upArrow) {
    selected.value = (selected.value - 1 + WRAP_MODES.length) % WRAP_MODES.length;
  } else if (key.downArrow) {
    selected.value = (selected.value + 1) % WRAP_MODES.length;
  }
});

const shout = (line: string) => line.toUpperCase();
</script>

<!--
  Text content stays on one line per element on purpose. A template text node
  that is not whitespace-only keeps a *condensed* copy of its surrounding
  whitespace, so breaking the sentence below across lines would render it with
  a leading and a trailing space — JSX drops that whitespace instead. The
  boolean props are `:prop="true"` for the reason given in `Progress.vue`.
-->
<template>
  <Box flexDirection="column" :gap="1">
    <Box flexDirection="column">
      <Text :bold="true">styles</Text>
      <Text>
        <Text color="green">green </Text>
        <Text color="black" backgroundColor="yellow">on yellow </Text>
        <Text :bold="true">bold </Text>
        <Text :italic="true">italic </Text>
        <Text :underline="true">underline </Text>
        <Text :strikethrough="true">strikethrough </Text>
        <Text :inverse="true">inverse </Text>
        <Text :dimColor="true">dim</Text>
      </Text>
    </Box>

    <Box flexDirection="column">
      <!--
        `wrap` on `<Text>` (ink's name for it) and `textWrap` on a `<Box>` are
        the same style; the mode is chosen per row here so the six are directly
        comparable at one width.
      -->
      <Text :bold="true">wrap modes in a 28-column box · ↑↓ to highlight one</Text>
      <Box
        v-for="(mode, index) in WRAP_MODES"
        :key="mode"
        flexDirection="column"
        :marginTop="1"
      >
        <Text
          :dimColor="index !== selected"
          :color="index === selected ? 'cyan' : undefined"
          >{{ index === selected ? '❯ ' : '  ' }}{{ mode }}</Text
        >
        <Box
          :width="28"
          borderStyle="single"
          :borderColor="index === selected ? 'cyan' : 'gray'"
        >
          <Text :wrap="mode">{{ SENTENCE }}</Text>
        </Box>
      </Box>
    </Box>

    <Box flexDirection="column">
      <Text :bold="true">Transform rewrites the painted string</Text>
      <Transform :transform="shout">
        <Text>shouting, without touching the source text</Text>
      </Transform>
    </Box>
  </Box>
</template>
