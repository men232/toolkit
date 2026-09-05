import { type ComputedRef, computed } from 'vue';
import wrapAnsi from 'wrap-ansi';
import { formatEntryPrefix } from '../logEntry.ts';
import type { TuiStore } from '../store.ts';
import type { LogEntry } from '../types.ts';
import { useAppListWidth } from './useAppListWidth.ts';
import { useLogViewport } from './useLogViewport.ts';

/** Border (2) plus `paddingX` (2) around the log panel's text. */
const LOG_PANEL_CHROME = 4;

export interface UseLogFeedResult {
  /** The entries that fit on screen at the current scroll offset. */
  readonly entries: ComputedRef<LogEntry[]>;
  /** `store.logScroll` clamped to what the feed can actually scroll. */
  readonly scrollOffset: ComputedRef<number>;
  /** The furthest back this feed can scroll at the current size. */
  readonly maxScroll: ComputedRef<number>;
  /** `' · scrolled +N'`, or empty while following the live tail. */
  readonly scrollLabel: ComputedRef<string>;
}

/**
 * The visible window onto the selected node's logs.
 *
 * Budgets by **rows, not entries**, and that is the whole point: an entry wider
 * than the panel wraps onto several rows, so a slice counted in entries
 * overruns the panel it was cut to fit. The panel clips what overruns it, which
 * silently drops whichever end the layout happens to sacrifice -- the newest
 * lines, or the status bar underneath.
 *
 * The wrap is computed with `wrap-ansi` under the options the renderer's own
 * `wrapText` uses, so the count here is the count Yoga will lay out rather than
 * an estimate. Log text arrives carrying the child process's ANSI colours,
 * which is why this cannot be a plain character count.
 *
 * Takes the store as a parameter for the reason spelled out on `useTuiStore`.
 */
export function useLogFeed(store: TuiStore): UseLogFeedResult {
  const { columns, visibleRows } = useLogViewport();
  const appListWidth = useAppListWidth(store);

  /** Columns the log text itself gets, once the app list and chrome are out. */
  const textWidth = computed(() =>
    Math.max(1, columns.value - appListWidth.value - LOG_PANEL_CHROME),
  );

  const rowsFor = (entry: LogEntry): number => {
    const line = formatEntryPrefix(entry) + entry.text;
    // `trim: false, hard: true` mirrors `wrapText` in `@andrew_l/vue-stdout`;
    // `hard` is what bounds a single over-long word to a predictable row count.
    return wrapAnsi(line, textWidth.value, { trim: false, hard: true }).split(
      '\n',
    ).length;
  };

  /**
   * The newest entries that fit, oldest-first -- taken from the tail backwards
   * until the next one would not fit whole. A partially visible entry is not
   * worth the row it costs: it reads as a truncated line with no marker.
   */
  const fittingFrom = (all: LogEntry[], end: number): LogEntry[] => {
    const budget = visibleRows.value;
    const taken: LogEntry[] = [];
    let used = 0;

    for (let i = end - 1; i >= 0; i--) {
      const cost = rowsFor(all[i]);
      if (used + cost > budget) break;
      used += cost;
      taken.push(all[i]);
    }

    return taken.reverse();
  };

  /**
   * How far back the feed can scroll, in entries: everything above the window
   * that currently fits. Counted rather than derived from a row total, because
   * one scroll step is one entry.
   */
  const maxScroll = computed(() => {
    const all = store.filteredEntries.value;
    return Math.max(0, all.length - fittingFrom(all, all.length).length);
  });

  // Clamped here rather than written back, so a shrinking feed (or a terminal
  // that just got taller) corrects itself instead of leaving `logScroll`
  // pointing past the end.
  const scrollOffset = computed(() =>
    Math.min(store.logScroll.value, maxScroll.value),
  );

  const entries = computed<LogEntry[]>(() => {
    const all = store.filteredEntries.value;
    return fittingFrom(all, all.length - scrollOffset.value);
  });

  const scrollLabel = computed(() =>
    scrollOffset.value > 0 ? ` · scrolled +${scrollOffset.value}` : '',
  );

  return { entries, scrollOffset, maxScroll, scrollLabel };
}
