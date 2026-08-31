<!--
  The oracle for `BareBooleanProps.vue`: the same tree with every boolean prop
  bound explicitly. Keep the two structurally identical — the whole assertion is
  that only the attribute *form* differs.
-->
<script setup lang="ts">
import { Box, ProgressBar, Text } from '../../src/components';
</script>

<template>
  <Box flexDirection="column" :width="40">
    <Text :bold="true">bold</Text>
    <Text :italic="true">italic</Text>
    <Text :underline="true">underline</Text>
    <Text :strikethrough="true">strikethrough</Text>
    <Text :inverse="true">inverse</Text>
    <Text :dimColor="true">dimColor</Text>

    <Box borderStyle="round" borderColor="green" :borderDimColor="true"><Text>a</Text></Box>
    <Box borderStyle="round" borderColor="green" :borderTopDimColor="true"><Text>b</Text></Box>
    <Box borderStyle="round" borderColor="green" :borderBottomDimColor="true"><Text>c</Text></Box>
    <Box borderStyle="round" borderColor="green" :borderLeftDimColor="true"><Text>d</Text></Box>
    <Box borderStyle="round" borderColor="green" :borderRightDimColor="true"><Text>e</Text></Box>

    <Box borderStyle="round" :borderTop="true"><Text>f</Text></Box>
    <Box borderStyle="round" :borderBottom="true"><Text>g</Text></Box>
    <Box borderStyle="round" :borderLeft="true"><Text>h</Text></Box>
    <Box borderStyle="round" :borderRight="true"><Text>i</Text></Box>

    <ProgressBar :value="50" :showPercent="true" />
  </Box>
</template>
