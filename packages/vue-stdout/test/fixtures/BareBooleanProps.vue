<!--
  Every boolean prop on the catalog, written as a bare attribute — the form a
  template author reaches for and the form `vue-tsc` approves.

  Structurally identical to `ExplicitBooleanProps.vue`, which writes the same
  props as `:prop="true"`. The two must render the same bytes; that pair is the
  reproduction for the bare-attribute defect.

  Every element sits on one line with no whitespace around its text, so the SFC
  compiler's whitespace condensing cannot contribute a difference of its own.
-->
<script setup lang="ts">
import { Box, ProgressBar, Text } from '../../src/components';
</script>

<template>
  <Box flexDirection="column" :width="40">
    <Text bold>bold</Text>
    <Text italic>italic</Text>
    <Text underline>underline</Text>
    <Text strikethrough>strikethrough</Text>
    <Text inverse>inverse</Text>
    <Text dimColor>dimColor</Text>

    <Box borderStyle="round" borderColor="green" borderDimColor><Text>a</Text></Box>
    <Box borderStyle="round" borderColor="green" borderTopDimColor><Text>b</Text></Box>
    <Box borderStyle="round" borderColor="green" borderBottomDimColor><Text>c</Text></Box>
    <Box borderStyle="round" borderColor="green" borderLeftDimColor><Text>d</Text></Box>
    <Box borderStyle="round" borderColor="green" borderRightDimColor><Text>e</Text></Box>

    <Box borderStyle="round" borderTop><Text>f</Text></Box>
    <Box borderStyle="round" borderBottom><Text>g</Text></Box>
    <Box borderStyle="round" borderLeft><Text>h</Text></Box>
    <Box borderStyle="round" borderRight><Text>i</Text></Box>

    <ProgressBar :value="50" showPercent />
  </Box>
</template>
