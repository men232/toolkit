<script setup lang="ts">
/**
 * Two things share the screen here, and the point is that they do not
 * interfere:
 *
 * - `<Static>` output scrolls into the terminal's own scrollback and is never
 *   repainted, so completed lines accumulate above the frame;
 * - the spinner below is repainted on every tick.
 *
 * A `console.log` fires every fifth completion as well: with `patchConsole`
 * on (the default) it must land above the live frame rather than tearing it
 * in half.
 */
import { onBeforeUnmount, ref } from 'vue';
import { Box, Static, Text } from '../../src';

defineOptions({ name: 'StaticDemo' });

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

interface Done {
  id: number;
  label: string;
}

const done = ref<Done[]>([]);
const frame = ref(0);
const elapsed = ref(0);

const spinner = setInterval(() => {
  frame.value = (frame.value + 1) % FRAMES.length;
}, 80);

const worker = setInterval(() => {
  const id = done.value.length + 1;
  done.value = [...done.value, { id, label: `task ${id} finished` }];
  elapsed.value += 1;

  if (id % 5 === 0) {
    console.log(`[console.log] ${id} tasks done so far`);
  }
}, 700);

onBeforeUnmount(() => {
  clearInterval(spinner);
  clearInterval(worker);
});
</script>

<template>
  <Box flexDirection="column">
    <!--
      `<Static>` hands its default slot a scope object (`{ item, index }`),
      which is what `v-slot` is for. The JSX this replaced had to call `h()`
      by hand and annotate the scope inline, because TSX has no way to type an
      object of slot functions as children — `StaticProps` declares `items`
      only. `item` is `unknown` by `StaticProps`' own design (a functional
      component cannot stay generic across the assignment), so the cast here
      is the same assumption the JSX annotation was making.
    -->
    <Static :items="done">
      <template #default="{ item }">
        <Box :key="(item as Done).id">
          <Text color="green">✔ </Text>
          <Text>{{ (item as Done).label }}</Text>
        </Box>
      </template>
    </Static>

    <Box borderStyle="round" :paddingX="1" :marginTop="1">
      <!-- The spinner's trailing space rides *inside* the interpolation: a
           whitespace-only text node in last position is dropped outright by
           the template compiler, so `{{ FRAMES[frame] }} ` would lose it. -->
      <Text color="cyan">{{ `${FRAMES[frame]} ` }}</Text>
      <Text>working… {{ done.length }} done, {{ elapsed }}s elapsed</Text>
    </Box>
  </Box>
</template>
