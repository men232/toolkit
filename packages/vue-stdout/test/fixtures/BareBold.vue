<!--
  The minimal reproduction: one bare boolean attribute, nothing else. Paired
  with the JSX `<Text bold>` in `test/template-boolean-props.test.tsx`, which
  is the byte-for-byte oracle.

  Deliberately one line with no whitespace around the text, so the SFC
  compiler's `whitespace: 'condense'` rules (see
  `.agents/docs/gotchas.md#template-whitespace-is-not-jsx-whitespace`) cannot
  contribute a difference and confound the assertion.
-->
<script setup lang="ts">
import { Text } from '../../src/components';
</script>

<template>
  <Text bold>X</Text>
</template>
