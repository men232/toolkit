import { noop } from '@andrew_l/toolkit';
import { defineComponent, onBeforeUnmount, ref } from 'vue';
import { Box, ProgressBar, Text, createApp, createContainer } from '../';
import '../runtime';

const Main = defineComponent(() => {
  const progress = ref(0);

  const timer = setInterval(() => {
    progress.value++;
  }, 100);

  onBeforeUnmount(() => clearInterval(timer));

  return () => (
    <Box borderStyle="round">
      <Text>
        <Text>Hello From</Text>
        <Text color="green">
          {' '}
          Vue {(progress.value / 4) % 2 !== 0 ? '🤯' : ''}
        </Text>
      </Text>

      <ProgressBar
        variant="round"
        showPercent
        color={progress.value >= 100 ? 'cyan' : 'green'}
        value={progress.value}
      />
    </Box>
  );
});

const app = createApp(Main);
app.config.warnHandler = noop;
app.mount(createContainer());
