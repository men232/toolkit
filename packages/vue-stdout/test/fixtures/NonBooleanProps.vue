<!--
  The counterweight to `BareBooleanProps.vue`.

  Fixing the bare-attribute defect by declaring runtime `props` on the catalog
  would have been all-or-nothing: Vue routes only *declared* names into `props`
  and everything else into `attrs`, so a declaration naming just the booleans
  would have deleted every colour, size, flex and string property on the way
  through `<Box>`'s `{...props}` spread — turning a narrow bug into a wide one.

  This fixture is the tripwire for that. Every kind of non-boolean prop is here
  — colours, numbers, percentage strings, enum strings, a renamed prop
  (`wrap`), a function prop (`<Transform>`), a scoped slot (`<Static>`) and
  ordinary slot content — and the test asserts it against the JSX tree that
  builds the same thing. If a change ever starts eating undeclared props, the
  bytes move here first.
-->
<script setup lang="ts">
import { Box, Static, Text, Transform } from '../../src/components';

const items = ['one', 'two'];
</script>

<template>
  <Box flexDirection="column" :width="40" :paddingX="2" borderStyle="double" borderColor="magenta">
    <Text color="green" backgroundColor="blue">colored</Text>
    <Text color="#ff8800">truecolor</Text>
    <Text wrap="truncate-end">a rather long line that has to be truncated somewhere</Text>
    <Box :flexGrow="1" justifyContent="flex-end" alignItems="center" width="50%"><Text>grown</Text></Box>
    <Box :marginTop="1" :gap="2" flexDirection="row"><Text>l</Text><Text>r</Text></Box>
    <Transform :transform="(output: string) => `[${output}]`"><Text>wrapped</Text></Transform>
    <Static :items="items">
      <template #default="{ item, index }">
        <!-- One interpolation, not `{{ index }}:{{ item }}`, so this node and
             the JSX oracle's have the same child count. -->
        <Text :key="index" color="cyan">{{ `${index}:${String(item)}` }}</Text>
      </template>
    </Static>
  </Box>
</template>
