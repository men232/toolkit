import type { LogLevel } from '@andrew_l/toolkit';
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

export interface LifecycleHandlers {
  stop(id: string): Promise<void>;
  start(id: string): Promise<void>;
  restart(id: string): Promise<void>;
}

/**
 * What the log panel's header reports about the current selection: one app
 * (aggregating every thread it owns) or one thread on its own.
 */
export interface SelectionInfo {
  appName: string;
  /** Set only when a single thread is selected. */
  pid?: number;
  pids: number[];
  /** Set only when a single thread is selected. */
  state?: ManagedThread.State;
  states: ManagedThread.State[];
  processCount: number;
  /** Prefix each line with its thread's pid -- an app with several threads. */
  showProcessTag: boolean;
}
