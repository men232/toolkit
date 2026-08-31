<!--
  `v-bind="obj"` merges an object's keys into the element's props verbatim,
  without going through the compiler's attribute list. It is the path a
  key-rewriting fix is most likely to get wrong in either direction, so both
  spellings are covered: this file spreads camelCase keys,
  `SpreadKebabProps.vue` spreads the hyphenated ones, and the two must render
  the same bytes as each other and as the literal-attribute fixtures.
-->
<script setup lang="ts">
import { Box, Text } from '../../src/components';

const boxProps = {
  borderStyle: 'round',
  borderColor: 'green',
  flexDirection: 'column',
  paddingX: 1,
  marginTop: 1,
} as const;

const textProps = { backgroundColor: 'blue', dimColor: true } as const;
</script>

<template>
  <Box :width="40"><Box v-bind="boxProps"><Text v-bind="textProps" color="red">spread</Text></Box></Box>
</template>
