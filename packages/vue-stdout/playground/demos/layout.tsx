import { defineComponent } from 'vue';
import { Box, Text, useWindowSize } from '../../src';

const Swatch = defineComponent<{ label: string }>(
  props => () => (
    <Box borderStyle="round" borderColor="gray" paddingX={1}>
      <Text>{props.label}</Text>
    </Box>
  ),
  { name: 'Swatch', props: ['label'] },
);

export default defineComponent({
  name: 'LayoutDemo',
  setup() {
    // Resize the terminal while this demo is open: the ruler below is built
    // with JS arithmetic on `columns`, so it only tracks the window because
    // `useWindowSize` makes the size reactive. The flex boxes further down
    // re-flow through Yoga either way.
    const { columns, rows } = useWindowSize();

    return () => (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold>
            useWindowSize · {columns.value}×{rows.value}
          </Text>
          <Text dimColor>
            {'·'.repeat(Math.max(Math.min(columns.value, 60) - 1, 0)) + '|'}
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text bold>flexDirection="row" · justifyContent</Text>
          {(['flex-start', 'center', 'flex-end', 'space-between'] as const).map(
            justify => (
              <Box
                key={justify}
                width={44}
                justifyContent={justify}
                borderStyle="single"
                borderColor="blue"
              >
                <Swatch label="a" />
                <Swatch label="b" />
              </Box>
            ),
          )}
        </Box>

        <Box flexDirection="column">
          <Text bold>alignItems on a fixed-height row</Text>
          <Box height={7} borderStyle="single" borderColor="magenta">
            {(['flex-start', 'center', 'flex-end'] as const).map(align => (
              <Box key={align} alignItems={align} height="100%" marginRight={2}>
                <Swatch label={align} />
              </Box>
            ))}
          </Box>
        </Box>

        <Box flexDirection="column">
          <Text bold>flexGrow shares the leftover width</Text>
          <Box width={44} borderStyle="single" borderColor="green">
            <Box flexGrow={1}>
              <Text>grow 1</Text>
            </Box>
            <Box flexGrow={2}>
              <Text>grow 2</Text>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  },
});
