<script setup lang="ts">
import { Box } from '../../src/components/Box';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { recordError } from './error-recorder';

const Thrower = {
  render() {
    throw new Error('sfc-boom');
  },
};

const OnceThrower = {
  render() {
    throw new Error('sfc-boom-once');
  },
};
</script>

<template>
  <Box flexDirection="column">
    <ErrorBoundary @error="recordError">
      <Thrower />
    </ErrorBoundary>
    <!--
      `.once` is a v-on modifier, and the template compiler turns it into an
      `onErrorOnce` prop that only `emit()` knows how to resolve. A component
      reading `props.onError` by hand never sees it, so this listener is the
      part of the template surface that genuinely does not work without
      `emits` declared.
    -->
    <ErrorBoundary @error.once="recordError">
      <OnceThrower />
    </ErrorBoundary>
  </Box>
</template>
