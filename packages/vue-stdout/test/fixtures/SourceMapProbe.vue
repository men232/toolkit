<script setup lang="ts">
// Exists only to throw, so `test/sfc-source-maps.test.ts` can read the stack
// frame. That test asserts these exact line numbers: the `throw` is on line 9
// and the `boom()` call on line 12. The comment above them is padding, and it
// is load-bearing — it puts the source positions far enough from the compiled
// render function's own line numbering that a frame carrying compiled-output
// positions cannot match the source ones by coincidence.
function boom(): never {
  throw new Error('sfc-source-map-probe');
}

boom();
</script>

<template>
  <stdout-text>never reached</stdout-text>
</template>
