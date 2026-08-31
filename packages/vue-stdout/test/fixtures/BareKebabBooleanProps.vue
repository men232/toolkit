<!--
  Both halves of the class in one file: a bare *and* hyphenated boolean
  attribute. `<Text dim-color>` arrives with the wrong key (`dim-color`, which
  nothing reads) carrying the wrong value (`""`, which is falsy) — so it needed
  the kebab fix and the boolean cast, in that order, to paint anything.

  The oracle is `ExplicitBooleanProps.vue`, which writes the same tree as
  `:prop="true"` in camelCase. Keep all three structurally identical; the whole
  assertion is that only the attribute *form* differs.

  Single-word booleans (`bold`, `italic`, `underline`, `strikethrough`,
  `inverse`) have no hyphenated spelling and are written bare here, exactly as
  in `BareBooleanProps.vue`. `border-style` is hyphenated too, so each border
  case depends on the key rewrite for the border to exist at all.
-->
<script setup lang="ts">
import { Box, ProgressBar, Text } from '../../src/components';
</script>

<template>
  <Box flex-direction="column" :width="40">
    <Text bold>bold</Text>
    <Text italic>italic</Text>
    <Text underline>underline</Text>
    <Text strikethrough>strikethrough</Text>
    <Text inverse>inverse</Text>
    <Text dim-color>dimColor</Text>

    <Box border-style="round" border-color="green" border-dim-color><Text>a</Text></Box>
    <Box border-style="round" border-color="green" border-top-dim-color><Text>b</Text></Box>
    <Box border-style="round" border-color="green" border-bottom-dim-color><Text>c</Text></Box>
    <Box border-style="round" border-color="green" border-left-dim-color><Text>d</Text></Box>
    <Box border-style="round" border-color="green" border-right-dim-color><Text>e</Text></Box>

    <Box border-style="round" border-top><Text>f</Text></Box>
    <Box border-style="round" border-bottom><Text>g</Text></Box>
    <Box border-style="round" border-left><Text>h</Text></Box>
    <Box border-style="round" border-right><Text>i</Text></Box>

    <ProgressBar :value="50" show-percent />
  </Box>
</template>
