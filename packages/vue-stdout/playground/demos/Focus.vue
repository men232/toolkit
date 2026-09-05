<script setup lang="ts">
import { Box, Text, useFocusManager, useInput } from '../../src';
import SelectList from './SelectList.vue';

const { focus } = useFocusManager();

// `f`/`c` jump focus by id, which is the half of the focus API Tab alone
// never exercises.
useInput(input => {
  if (input === 'f') focus('fruits');
  if (input === 'c') focus('colors');
});

const FRUITS = ['Apple', 'Banana', 'Cherry', 'Dragonfruit', 'Elderberry'];
const COLORS = ['Red', 'Green', 'Blue', 'Yellow'];
</script>

<template>
  <Box flexDirection="column">
    <!-- One line on purpose; see the note in `Text.vue`. -->
    <Text :dimColor="true"
      >↑↓ move the selection · Tab/Shift+Tab switch focus · f/c focus a list by
      id</Text
    >

    <Box :marginTop="1">
      <SelectList
        id="fruits"
        title="Fruits"
        :items="FRUITS"
        :autoFocus="true"
      />
      <SelectList id="colors" title="Colors" :items="COLORS" />
    </Box>
  </Box>
</template>
