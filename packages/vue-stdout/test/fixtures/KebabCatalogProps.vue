<!--
  `CamelCatalogProps.vue` with every multi-word prop name hyphenated — the
  spelling a template author reaches for out of HTML habit, and the spelling
  `vue-tsc` approves without comment.

  Line for line the same tree as its twin; only prop *names* differ. Single-word
  props (`color`, `width`, `gap`, `wrap`, `items`, `value`, `transform`,
  `count`) have no hyphenated form and are spelled identically in both files.
-->
<script setup lang="ts">
import {
  Box,
  NewLine,
  ProgressBar,
  Spacer,
  Static,
  Text,
  Transform,
} from '../../src/components';

const items = ['one', 'two'];
</script>

<template>
  <Box flex-direction="column" :width="46" :padding-x="1">
    <Box border-style="round" border-color="green" :padding-x="1"><Text color="green" background-color="blue" :dim-color="true">a</Text></Box>
    <Box border-style="single" :border-top="false" :border-left="false" :border-dim-color="true"><Text>b</Text></Box>
    <Box flex-direction="row" justify-content="space-between" align-items="center" :column-gap="2" :min-height="3"><Text>l</Text><Spacer /><Text>r</Text></Box>
    <Box flex-direction="row"><Box :flex-grow="1" align-self="flex-end"><Text>g</Text></Box><Box :flex-shrink="0" :min-width="6"><Text>s</Text></Box></Box>
    <Box :margin-top="1" :margin-bottom="1" :margin-left="2" :margin-right="1" :padding-top="1" :padding-bottom="1"><Text>p</Text></Box>
    <Box :margin-x="1" :margin-y="1" :padding-y="1" :padding-left="1" :padding-right="1" :max-width="20"><Text>q</Text></Box>
    <Box border-style="round" border-top-color="red" border-bottom-color="blue" border-left-color="cyan" border-right-color="yellow"><Text>c</Text></Box>
    <Box border-style="round" border-background-color="black" :border-top-dim-color="true" :border-right-dim-color="true"><Text>d</Text></Box>
    <Box border-style="round" border-top-background-color="red" border-bottom-background-color="blue" border-left-background-color="cyan" border-right-background-color="yellow"><Text>e</Text></Box>
    <Box :border-bottom="false" :border-right="false" border-style="double" :border-bottom-dim-color="true" :border-left-dim-color="true"><Text>f</Text></Box>
    <Box flex-direction="row" flex-wrap="wrap" align-content="flex-start" :row-gap="1" :max-height="4"><Text>w</Text><Text>x</Text></Box>
    <Box :aspect-ratio="4" :min-width="8" :max-width="12" :max-height="3" overflow-x="hidden" overflow-y="hidden"><Text>overflowing text</Text></Box>
    <Box flex-basis="8" flex-direction="row"><Text>basis</Text></Box>
    <Box text-wrap="truncate-end" :width="12"><Text>wrapped by the box</Text></Box>
    <Text color="magenta" background-color="black" :strikethrough="true">styled</Text>
    <Text wrap="truncate-end">a rather long line that has to be truncated somewhere</Text>
    <Text>nl<NewLine :count="2" />after</Text>
    <Transform :transform="(output: string) => `[${output}]`"><Text>wrapped</Text></Transform>
    <ProgressBar :value="50" :show-percent="true" />
    <ProgressBar :value="50" :show-percent="true" color="cyan" background-color="black" />
    <Static :items="items">
      <template #default="{ item, index }">
        <Text :key="index" color="cyan">{{ `${index}:${String(item)}` }}</Text>
      </template>
    </Static>
  </Box>
</template>
