import type { LogLevel } from '@andrew_l/toolkit';
import { EventEmitter } from 'node:events';
import type { ManagedThread } from '../managedThread.ts';

export interface LogEntry {
  ts: number;
  level: LogLevel;
  text: string;
}

export interface ThreadNode {
  kind: 'thread';
  id: string;
  name: string;
  parentId: string;
  threadId: number;
  pid: number;
  state: ManagedThread.State;
}

export interface AppNode {
  kind: 'app';
  id: string;
  name: string;
  state: ManagedThread.State;
  expanded: boolean;
  threads: ThreadNode[] | null;
}

export type TreeNode = AppNode | ThreadNode;

export type LevelFilter = 'all' | 'info' | 'warn' | 'error';

export interface LifecycleHandlers {
  stop(id: string): Promise<void>;
  start(id: string): Promise<void>;
  restart(id: string): Promise<void>;
}

const LOG_BUFFER_CAP = 2000;

class RingBuffer<T> {
  private buf: T[] = [];
  private start = 0;
  constructor(private cap: number) {}
  push(item: T): void {
    if (this.buf.length < this.cap) {
      this.buf.push(item);
    } else {
      this.buf[this.start] = item;
      this.start = (this.start + 1) % this.cap;
    }
  }
  size(): number {
    return this.buf.length;
  }
  toArray(): T[] {
    if (this.start === 0) return this.buf.slice();
    return this.buf.slice(this.start).concat(this.buf.slice(0, this.start));
  }
  clear(): void {
    this.buf = [];
    this.start = 0;
  }
}

export interface TuiStore {
  apps: AppNode[];
  logs: Map<string, RingBuffer<LogEntry>>;
  system: LogEntry | null;
  selectedId: string | null;
  filter: LevelFilter;
  logScroll: number;
  handlers: LifecycleHandlers;
  pushLog(nodeId: string, entry: LogEntry): void;
  setState(nodeId: string, state: ManagedThread.State): void;
  setSelected(nodeId: string | null): void;
  setFilter(filter: LevelFilter): void;
  setSystem(entry: LogEntry): void;
  toggleExpand(appId: string): void;
  addApp(node: AppNode): void;
  setThreads(appId: string, threads: ThreadNode[]): void;
  setPid(nodeId: string, pid: number): void;
  getLogs(nodeId: string): LogEntry[];
  clearLogs(nodeId: string): void;
  setLogScroll(offset: number): void;
  subscribe(fn: () => void): () => void;
}

const noopHandlers: LifecycleHandlers = {
  stop: () => Promise.resolve(),
  start: () => Promise.resolve(),
  restart: () => Promise.resolve(),
};

export function createTuiStore(): TuiStore {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);
  const logs = new Map<string, RingBuffer<LogEntry>>();
  const apps: AppNode[] = [];

  const bufferOf = (id: string): RingBuffer<LogEntry> => {
    let buf = logs.get(id);
    if (!buf) {
      buf = new RingBuffer<LogEntry>(LOG_BUFFER_CAP);
      logs.set(id, buf);
    }
    return buf;
  };

  const notify = (): void => {
    emitter.emit('change');
  };

  const isSelectedFeed = (nodeId: string): boolean => {
    if (!store.selectedId) return false;
    if (store.selectedId === nodeId) return true;
    for (const app of apps) {
      if (app.id !== store.selectedId) continue;
      return !!app.threads?.some(t => t.id === nodeId);
    }
    return false;
  };

  const store: TuiStore = {
    apps,
    logs,
    system: null,
    selectedId: null,
    filter: 'info',
    logScroll: 0,
    handlers: noopHandlers,
    pushLog(nodeId, entry) {
      bufferOf(nodeId).push(entry);
      if (
        store.logScroll > 0 &&
        isSelectedFeed(nodeId) &&
        passesFilter(entry, store.filter)
      ) {
        store.logScroll += 1;
      }
      notify();
    },
    setState(nodeId, state) {
      for (const app of apps) {
        if (app.id === nodeId) {
          app.state = state;
          notify();
          return;
        }
        if (app.threads) {
          for (const t of app.threads) {
            if (t.id === nodeId) {
              t.state = state;
              notify();
              return;
            }
          }
        }
      }
    },
    setSelected(nodeId) {
      store.selectedId = nodeId;
      store.logScroll = 0;
      notify();
    },
    setFilter(filter) {
      store.filter = filter;
      store.logScroll = 0;
      notify();
    },
    setLogScroll(offset) {
      store.logScroll = Math.max(0, offset);
      notify();
    },
    setSystem(entry) {
      store.system = entry;
      notify();
    },
    toggleExpand(appId) {
      for (const app of apps) {
        if (app.id === appId) {
          app.expanded = !app.expanded;
          notify();
          return;
        }
      }
    },
    addApp(node) {
      apps.push(node);
      if (!store.selectedId) store.selectedId = node.id;
      notify();
    },
    setThreads(appId, threads) {
      for (const app of apps) {
        if (app.id === appId) {
          app.threads = threads;
          notify();
          return;
        }
      }
    },
    setPid(nodeId, pid) {
      for (const app of apps) {
        if (app.threads) {
          for (const t of app.threads) {
            if (t.id === nodeId) {
              t.pid = pid;
              notify();
              return;
            }
          }
        }
      }
    },
    getLogs(nodeId) {
      const buf = logs.get(nodeId);
      return buf ? buf.toArray() : [];
    },
    clearLogs(nodeId) {
      logs.get(nodeId)?.clear();
      notify();
    },
    subscribe(fn) {
      emitter.on('change', fn);
      return () => emitter.off('change', fn);
    },
  };

  return store;
}

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  log: 1,
  info: 2,
  warn: 3,
  error: 4,
};

const FILTER_THRESHOLD: Record<LevelFilter, number> = {
  all: 0,
  info: LEVEL_RANK.info,
  warn: LEVEL_RANK.warn,
  error: LEVEL_RANK.error,
};

export function passesFilter(entry: LogEntry, filter: LevelFilter): boolean {
  return LEVEL_RANK[entry.level] >= FILTER_THRESHOLD[filter];
}

export function getSelectedFilteredCount(store: TuiStore): number {
  if (!store.selectedId) return 0;
  const passes = (e: LogEntry): boolean => passesFilter(e, store.filter);
  for (const app of store.apps) {
    if (app.id !== store.selectedId) continue;
    if (!app.threads || app.threads.length === 0) {
      return store.getLogs(app.id).filter(passes).length;
    }
    let count = 0;
    for (const t of app.threads) {
      for (const e of store.getLogs(t.id)) if (passes(e)) count += 1;
    }
    return count;
  }
  return store.getLogs(store.selectedId).filter(passes).length;
}

export function nextFilter(filter: LevelFilter): LevelFilter {
  switch (filter) {
    case 'all':
      return 'info';
    case 'info':
      return 'warn';
    case 'warn':
      return 'error';
    case 'error':
      return 'all';
  }
}

export function flattenVisibleTree(apps: AppNode[]): TreeNode[] {
  const out: TreeNode[] = [];
  for (const app of apps) {
    out.push(app);
    if (app.expanded && app.threads) {
      for (const t of app.threads) out.push(t);
    }
  }
  return out;
}
