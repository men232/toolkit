<!--
  The reference spelling: every prop written camelCase, the way this package
  has always documented it.

  `KebabCatalogProps.vue` is the byte-for-byte twin of this file with each
  multi-word prop name hyphenated instead. The two must render the same bytes.
  Keep them structurally identical — same elements, same order, same
  whitespace — so the only difference the comparison can ever report is the
  spelling of a prop name. Every element sits on one line with no whitespace
  around its text, so the SFC compiler's whitespace condensing cannot
  contribute a difference of its own.
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
  <Box flexDirection="column" :width="46" :paddingX="1">
    <Box borderStyle="round" borderColor="green" :paddingX="1"><Text color="green" backgroundColor="blue" :dimColor="true">a</Text></Box>
    <Box borderStyle="single" :borderTop="false" :borderLeft="false" :borderDimColor="true"><Text>b</Text></Box>
    <Box flexDirection="row" justifyContent="space-between" alignItems="center" :columnGap="2" :minHeight="3"><Text>l</Text><Spacer /><Text>r</Text></Box>
    <Box flexDirection="row"><Box :flexGrow="1" alignSelf="flex-end"><Text>g</Text></Box><Box :flexShrink="0" :minWidth="6"><Text>s</Text></Box></Box>
    <Box :marginTop="1" :marginBottom="1" :marginLeft="2" :marginRight="1" :paddingTop="1" :paddingBottom="1"><Text>p</Text></Box>
    <Box :marginX="1" :marginY="1" :paddingY="1" :paddingLeft="1" :paddingRight="1" :maxWidth="20"><Text>q</Text></Box>
    <Box borderStyle="round" borderTopColor="red" borderBottomColor="blue" borderLeftColor="cyan" borderRightColor="yellow"><Text>c</Text></Box>
    <Box borderStyle="round" borderBackgroundColor="black" :borderTopDimColor="true" :borderRightDimColor="true"><Text>d</Text></Box>
    <Box borderStyle="round" borderTopBackgroundColor="red" borderBottomBackgroundColor="blue" borderLeftBackgroundColor="cyan" borderRightBackgroundColor="yellow"><Text>e</Text></Box>
    <Box :borderBottom="false" :borderRight="false" borderStyle="double" :borderBottomDimColor="true" :borderLeftDimColor="true"><Text>f</Text></Box>
    <Box flexDirection="row" flexWrap="wrap" alignContent="flex-start" :rowGap="1" :maxHeight="4"><Text>w</Text><Text>x</Text></Box>
    <Box :aspectRatio="4" :minWidth="8" :maxWidth="12" :maxHeight="3" overflowX="hidden" overflowY="hidden"><Text>overflowing text</Text></Box>
    <Box flexBasis="8" flexDirection="row"><Text>basis</Text></Box>
    <Box textWrap="truncate-end" :width="12"><Text>wrapped by the box</Text></Box>
    <Text color="magenta" backgroundColor="black" :strikethrough="true">styled</Text>
    <Text wrap="truncate-end">a rather long line that has to be truncated somewhere</Text>
    <Text>nl<NewLine :count="2" />after</Text>
    <Transform :transform="(output: string) => `[${output}]`"><Text>wrapped</Text></Transform>
    <ProgressBar :value="50" :showPercent="true" />
    <ProgressBar :value="50" :showPercent="true" color="cyan" backgroundColor="black" />
    <Static :items="items">
      <template #default="{ item, index }">
        <Text :key="index" color="cyan">{{ `${index}:${String(item)}` }}</Text>
      </template>
    </Static>
  </Box>
</template>
