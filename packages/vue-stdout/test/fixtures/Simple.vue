<!--
  Deliberately written against the *private* host tags rather than `<Box>` /
  `<Text>`, unlike every other SFC in this repo. It is the fixture behind
  `test/sfc-register.test.ts`'s "compiles intrinsic tags as elements" case and
  `test/sfc-vite.test.ts`'s no-warning case, both of which assert that the SFC
  compiler was handed `isCustomElement`. A fixture that only names components
  would satisfy those assertions for the wrong reason — imported bindings
  resolve without any compiler option at all.
-->
<script setup lang="ts">
import { ref } from 'vue';

const label = ref<string>('from sfc');
const items: number[] = [1, 2];
</script>

<template>
  <stdout-box>
    <stdout-text>{{ label }}</stdout-text>
    <stdout-text v-for="n in items" :key="n">{{ n }}</stdout-text>
  </stdout-box>
</template>
