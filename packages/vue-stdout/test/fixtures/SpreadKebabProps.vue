<!--
  The hyphenated twin of `SpreadCamelProps.vue` — same tree, same values, keys
  spelled kebab inside the spread objects. See that file for why the spread
  path is tested separately from literal attributes.
-->
<script setup lang="ts">
import { Box, Text } from '../../src/components';

const boxProps = {
  'border-style': 'round',
  'border-color': 'green',
  'flex-direction': 'column',
  'padding-x': 1,
  'margin-top': 1,
} as const;

const textProps = { 'background-color': 'blue', 'dim-color': true } as const;
</script>

<template>
  <Box :width="40"><Box v-bind="boxProps"><Text v-bind="textProps" color="red">spread</Text></Box></Box>
</template>
