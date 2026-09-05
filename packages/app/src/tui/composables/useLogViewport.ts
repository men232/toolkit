import { useWindowSize } from '@andrew_l/vue-stdout';
import { type ComputedRef, computed } from 'vue';

/**
 * Rows the log panel spends on something other than a log line: its two
 * borders, the header line, and the status bar below it.
 */
const LOG_CHROME_ROWS = 5;

export interface UseLogViewportResult {
  /** Terminal width, updated on resize. */
  readonly columns: ComputedRef<number>;
  /** Terminal height, updated on resize. */
  readonly rows: ComputedRef<number>;
  /** Log lines that fit on screen at the current height. */
  readonly visibleRows: ComputedRef<number>;
}

/**
 * The terminal's dimensions and how many log rows fit in them.
 *
 * Reads `useWindowSize()` rather than `useStdout().stdout.rows` because a
 * `setup()` runs once: a plain property read would pin the panel to its
 * mount-time height and stop reacting to a resize.
 */
export function useLogViewport(): UseLogViewportResult {
  const { columns, rows } = useWindowSize();

  return {
    columns,
    rows,
    visibleRows: computed(() => Math.max(1, rows.value - LOG_CHROME_ROWS)),
  };
}
