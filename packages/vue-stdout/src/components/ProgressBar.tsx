import { computed, defineComponent, shallowRef } from 'vue';
import { useContainerSize } from '../hooks';
import type { DOMElement } from '../tree';
import type { Styles } from '../tree/RenderTree/utils/applyStyles';
import { Box } from './Box';
import type { TextProps } from './Text';

export interface ProgressBarProps {
  value: number;
  min?: number;
  max?: number;
  color?: TextProps['color'];
  backgroundColor?: TextProps['backgroundColor'];
  showPercent?: boolean;
  variant?: Styles['borderStyle'];
}

const remainingCharacter = '░';
const completedCharacter = '█';

export const ProgressBar = defineComponent<ProgressBarProps>(
  props => {
    const progressElement = shallowRef<DOMElement | null>(null);
    const { width } = useContainerSize(progressElement);

    const percent = computed(() => {
      const min = props.min ?? 0;
      const max = props.max ?? 100;
      return Math.min((props.value - min) / max, 1);
    });

    const percentText = computed(() => {
      return Math.floor(percent.value * 100) + '%';
    });

    const chars = computed(() => {
      let availableSpace = Math.max(
        width.value - percentText.value.length - 1,
        0,
      );

      if (!availableSpace) return '';

      const completeChars = Math.floor(availableSpace * percent.value);
      const renamingChars = availableSpace - completeChars;

      return (
        completedCharacter.repeat(completeChars) +
        remainingCharacter.repeat(renamingChars)
      );
    });

    return () => {
      const borderStyle = props.variant ?? 'round';

      return (
        <Box
          borderStyle={borderStyle}
          flexDirection="row"
          justifyContent="space-between"
          gap={1}
          ref={progressElement}
        >
          <Box flexGrow={1}>
            <span color={props.color}>
              {chars.value}
            </span>
          </Box>

          <Box width={4}>
            {props.showPercent && (
              <span color={props.color}>{percentText.value}</span>
            )}
          </Box>
        </Box>
      );
    };
  },
  {
    name: 'ProgressBar',
    props: [
      'min',
      'max',
      'value',
      'color',
      'backgroundColor',
      'showPercent',
      'variant',
    ],
  },
);
