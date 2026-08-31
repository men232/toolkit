import { Box, Text, createApp, useApp, useInput } from '@andrew_l/vue-stdout';
import { computed, defineComponent, ref } from 'vue';
import Stats from './Stats.vue';

const TASKS = ['Fetch', 'Build', 'Test', 'Publish'];

const App = defineComponent({
  name: 'App',
  setup() {
    const { exit } = useApp();
    const index = ref(0);
    const done = ref<number[]>([]);

    const doneCount = computed(() => done.value.length);

    useInput((input, key) => {
      if (key.upArrow) index.value = (index.value - 1 + TASKS.length) % TASKS.length;
      if (key.downArrow) index.value = (index.value + 1) % TASKS.length;

      if (input === ' ') {
        done.value = done.value.includes(index.value)
          ? done.value.filter(i => i !== index.value)
          : [...done.value, index.value];
      }

      if (input === 'q') exit();
    });

    return () => (
      <Box flexDirection="column" gap={1}>
        <Box>
          <Text bold>vue-stdout · vite build</Text>
        </Box>

        <Box flexDirection="column" borderStyle="round" paddingX={1}>
          {TASKS.map((task, i) => (
            <Box key={task}>
              <Text color={i === index.value ? 'cyan' : undefined}>
                {i === index.value ? '❯ ' : '  '}
                {done.value.includes(i) ? '[x]' : '[ ]'} {task}
              </Text>
            </Box>
          ))}
        </Box>

        <Stats done={doneCount.value} total={TASKS.length} />

        <Text dimColor>↑↓ move · space toggles · q quits</Text>
      </Box>
    );
  },
});

const app = createApp(App);

app.mount();

await app.waitUntilExit();
