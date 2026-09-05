import { type ComputedRef, type Ref, computed, reactive, ref, shallowRef, watch } from 'vue';
import { type LevelFilter, passesFilter } from './logFilter.ts';
import type {
  AppNode,
  LifecycleHandlers,
  LogEntry,
  SelectionInfo,
  ThreadNode,
  TreeNode,
} from './types.ts';

const LOG_BUFFER_CAP = 2000;

/**
 * The TUI's shared state, as reactive properties rather than a state bag with
 * setters.
 *
 * The member's *type* is its contract, checked rather than documented:
 *
 * - A `Ref` is state anyone may write -- `store.filter.value = 'warn'`. These
 *   had `setX()` wrappers that only assigned, which is a React reducer's shape.
 *   `logScroll` is a writable computed, so its "never negative" invariant lives
 *   on the property instead of at each call site.
 * - A `ComputedRef` is derived and has no setter at all, so a write is a
 *   compile error rather than a silently ignored one. These used to be free
 *   functions taking the store, re-run at every call site on every frame.
 * - `addApp` and `pushLog` are the only two members that do more than assign,
 *   and both exist because a non-Vue caller -- the child-process event bridge
 *   in `launchAppsTui.ts` -- drives them.
 *
 * Node state (`state`, `pid`, `threads`) has no member at all: `addApp` hands
 * back the reactive proxy and the bridge mutates that object directly.
 */
export interface TuiStore {
  /** The one-line message the status bar shows. */
  readonly system: Ref<LogEntry | null>;
  readonly selectedId: Ref<string | null>;
  readonly filter: Ref<LevelFilter>;
  /** Lines scrolled back from the live tail; `0` follows new output. */
  readonly logScroll: Ref<number>;
  /** Apps plus the threads of expanded apps, in display order. */
  readonly visibleNodes: ComputedRef<TreeNode[]>;
  /** What the selection is, or `null` when nothing is selected. */
  readonly selection: ComputedRef<SelectionInfo | null>;
  /** The selected node's log feed, already merged and level-filtered. */
  readonly filteredEntries: ComputedRef<LogEntry[]>;
  /** Start/stop/restart, supplied by whoever owns the threads. */
  readonly handlers: LifecycleHandlers;
  /**
   * Add an app and return its reactive proxy -- mutating that object (its
   * `state`, its `threads`, a thread's `pid`) is what makes the UI update, so
   * a caller must keep the returned value rather than the object it passed in.
   */
  addApp(node: AppNode): AppNode;
  pushLog(nodeId: string, entry: LogEntry): void;
}

export function createTuiStore(handlers: LifecycleHandlers): TuiStore {
  const apps = reactive<AppNode[]>([]);
  // Keyed by node id. A reactive Map of plain arrays, so `arr.push(entry)` is a
  // tracked write and the computeds below re-run because they *read* what
  // changed -- no version counter standing in for that dependency.
  const logs = reactive(new Map<string, LogEntry[]>());

  const system = shallowRef<LogEntry | null>(null);
  const selectedId = ref<string | null>(null);
  const filter = ref<LevelFilter>('info');

  const scrolledBack = ref(0);
  const logScroll = computed({
    get: () => scrolledBack.value,
    set: (offset: number) => {
      scrolledBack.value = Math.max(0, offset);
    },
  });

  const visibleNodes = computed<TreeNode[]>(() => {
    const out: TreeNode[] = [];
    for (const app of apps) {
      out.push(app);
      if (app.expanded && app.threads) out.push(...app.threads);
    }
    return out;
  });

  /** The app that owns the selection -- selected itself, or the thread's parent. */
  const selectedApp = computed<AppNode | null>(
    () =>
      apps.find(
        app =>
          app.id === selectedId.value ||
          !!app.threads?.some(thread => thread.id === selectedId.value),
      ) ?? null,
  );

  /** Set only when the selection is a thread rather than a whole app. */
  const selectedThread = computed<ThreadNode | null>(
    () =>
      selectedApp.value?.threads?.find(
        thread => thread.id === selectedId.value,
      ) ?? null,
  );

  const selection = computed<SelectionInfo | null>(() => {
    const app = selectedApp.value;
    if (!app) return null;

    const thread = selectedThread.value;
    if (thread) {
      return {
        appName: app.name,
        pid: thread.pid,
        pids: thread.pid > 0 ? [thread.pid] : [],
        state: thread.state,
        states: [thread.state],
        processCount: app.threads?.length ?? 0,
        showProcessTag: false,
      };
    }

    const threads = app.threads ?? [];
    return {
      appName: app.name,
      pids: Array.from(new Set(threads.map(t => t.pid).filter(pid => pid > 0))),
      states: threads.map(t => t.state),
      processCount: threads.length,
      showProcessTag: threads.length > 1,
    };
  });

  /**
   * A thread shows its own lines; an app shows every thread's, merged in
   * timestamp order and pid-tagged when there is more than one to tell apart.
   */
  const selectedEntries = computed<LogEntry[]>(() => {
    const app = selectedApp.value;
    if (!app) return [];

    const thread = selectedThread.value;
    if (thread) return logs.get(thread.id) ?? [];

    const threads = app.threads ?? [];
    if (threads.length === 0) return logs.get(app.id) ?? [];

    const tagged = threads.length > 1;
    const merged: LogEntry[] = [];
    for (const t of threads) {
      for (const entry of logs.get(t.id) ?? []) {
        merged.push(
          tagged ? { ...entry, text: `[${t.pid}] ${entry.text}` } : entry,
        );
      }
    }
    return merged.sort((a, b) => a.ts - b.ts);
  });

  const filteredEntries = computed<LogEntry[]>(() =>
    selectedEntries.value.filter(entry => passesFilter(entry, filter.value)),
  );

  /** Identifies the feed on screen; a change means a different set of lines. */
  const feedKey = computed(() => `${selectedId.value} ${filter.value}`);

  // One watcher owns every automatic move of `logScroll`, so nothing that
  // appends a log has to know scrolling exists:
  //
  //   * a different feed drops the view back to the live tail;
  //   * the same feed growing while scrolled back keeps the view anchored on
  //     the lines the user is reading, instead of letting them slide away.
  //
  // Both cases in one watcher rather than two, because two would race: the
  // reset and the anchor both fire on a selection change, and whichever ran
  // second would win.
  watch(
    [feedKey, () => filteredEntries.value.length],
    ([key, length], [previousKey, previousLength]) => {
      if (key !== previousKey) {
        logScroll.value = 0;
        return;
      }
      if (logScroll.value > 0 && length > previousLength) {
        logScroll.value += length - previousLength;
      }
    },
  );

  return {
    system,
    selectedId,
    filter,
    logScroll,
    visibleNodes,
    selection,
    filteredEntries,
    handlers,
    addApp(node: AppNode): AppNode {
      apps.push(node);
      const added = apps[apps.length - 1];
      if (!selectedId.value) selectedId.value = added.id;
      return added;
    },
    pushLog(nodeId: string, entry: LogEntry): void {
      let entries = logs.get(nodeId);
      if (!entries) {
        entries = [];
        logs.set(nodeId, entries);
      }
      entries.push(entry);
      if (entries.length > LOG_BUFFER_CAP) {
        entries.splice(0, entries.length - LOG_BUFFER_CAP);
      }
    },
  };
}
