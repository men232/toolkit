<script setup lang="ts">
/**
 * A frame that updates far faster than it is drawn: the timer ticks every
 * 40ms, so with the default `maxFps: 30` the renderer coalesces updates, and
 * the bar must still settle on its true final value once the burst stops.
 */
import { onBeforeUnmount, ref } from 'vue';
import { Box, ProgressBar, Text } from '../../src';

defineOptions({ name: 'ProgressDemo' });

const progress = ref(0);

const timer = setInterval(() => {
  progress.value = progress.value >= 100 ? 0 : progress.value + 1;
}, 40);

onBeforeUnmount(() => clearInterval(timer));

const variants = ['single', 'double', 'classic'] as const;
</script>

<!--
  The boolean props here are written `:showPercent="true"`, but a bare
  `showPercent` renders identically — the empty string a template compiles a
  bare attribute to is cast back to `true` at the component boundary
  (`src/components/booleanProps.ts`). So does `show-percent`, bare or bound:
  hyphenated prop names are rewritten to the prop they mean
  (`src/components/kebabProps.ts`, and for `ProgressBar` specifically by Vue
  itself, which camelizes against its runtime `props` declaration). camelCase
  here because that is what the API reference lists and what JSX requires.
-->
<template>
  <Box flexDirection="column" :gap="1" :width="48">
    <Box borderStyle="round" :paddingX="1" flexDirection="column">
      <Text>
        <Text>Hello from </Text>
        <Text color="green">Vue {{ progress % 8 < 4 ? '🤯' : '🙂' }}</Text>
      </Text>

      <ProgressBar
        variant="round"
        :showPercent="true"
        :color="progress >= 90 ? 'cyan' : 'green'"
        :value="progress"
      />
    </Box>

    <!--
      A non-zero `min`: the same tick, scaled over 50..100 instead of
      0..100, so it reads 0% at 50 and 100% at 100 and sits pinned at 0%
      for the first half of every cycle. The percentage used to divide by
      `max` rather than the range's span, which showed this bar at half
      the value it should be.
    -->
    <ProgressBar
      variant="round"
      :showPercent="true"
      color="yellow"
      :min="50"
      :max="100"
      :value="progress"
    />

    <ProgressBar
      v-for="variant in variants"
      :key="variant"
      :variant="variant"
      :showPercent="true"
      :value="progress"
    />
  </Box>
</template>
