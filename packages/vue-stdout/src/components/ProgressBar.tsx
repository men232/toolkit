import { computed, defineComponent, shallowRef } from 'vue';
import { useContainerSize } from '../hooks';
import type { DOMElement } from '../tree';
import type { Styles } from '../tree/utils/applyStyles';
import { castBooleanProps } from './booleanProps';
import { Box } from './Box';
import { Text, type TextProps } from './Text';

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

/**
 * Width reserved for the percent label, in both the layout (`<Box
 * width={percentSlotWidth}>` below) and the bar's own `availableSpace` math --
 * the two must agree or the bar wraps onto a spurious second line.
 *
 * Fixed at the widest case ("100%") rather than tracking
 * `percentText.value.length`, which is 2 characters at single digits and 3 at
 * double: reserved space that grew and shrank with it would shift the bar
 * column by a character every time the percentage crossed a digit boundary.
 */
const percentSlotWidth = 4;

export const ProgressBar = defineComponent<ProgressBarProps>(
  props => {
    const progressElement = shallowRef<DOMElement | null>(null);
    const { width } = useContainerSize(progressElement);

    /**
     * `value`'s position in the `[min, max]` range, as a fraction in `[0, 1]`.
     *
     * The denominator is the range's *span*, not `max`: dividing by `max`
     * alone is correct only when `min` is 0 and otherwise scales everything
     * down by `min/max`.
     *
     * Clamped at both ends, not only the top -- a `value` below `min` gives a
     * negative fraction, which renders as a "-25%" label and makes the
     * `repeat()` counts in `chars` negative, a RangeError as soon as the bar
     * has any width.
     *
     * A `max` at or below `min` leaves no range to be part-way along, so
     * anything that reached `max` is reported complete and everything else as
     * not started -- keeping NaN/Infinity out of the layout without inventing
     * a partial fill.
     */
    const percent = computed(() => {
      const min = props.min ?? 0;
      const max = props.max ?? 100;
      const span = max - min;

      if (span <= 0) return props.value >= max ? 1 : 0;

      return Math.min(Math.max((props.value - min) / span, 0), 1);
    });

    const percentText = computed(() => {
      return Math.floor(percent.value * 100) + '%';
    });

    const chars = computed(() => {
      let availableSpace = Math.max(
        width.value - percentSlotWidth - 1,
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
      // `props` is declared as a plain string array below, which names the
      // props but gives Vue no types to cast against -- so a template's bare
      // `<ProgressBar showPercent>` arrives as the falsy empty string, exactly
      // as it does on the undeclared functional components. Cast through the
      // same catalog-wide key list rather than switching this one component to
      // a typed object declaration, so there is a single answer to "what is a
      // boolean prop here" for the exhaustiveness checks to hold to.
      //
      // Reading it inside the render function keeps reactivity: the copy is
      // made while the render effect is tracking, so `showPercent` is
      // subscribed exactly as `props.showPercent` was.
      const castProps = castBooleanProps(props);
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
            <Text color={props.color}>{chars.value}</Text>
          </Box>

          <Box width={percentSlotWidth}>
            {castProps.showPercent && (
              <Text color={props.color}>{percentText.value}</Text>
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
