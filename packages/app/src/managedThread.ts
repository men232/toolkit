import { isShuttingDown } from '@andrew_l/graceful';
import {
  type Data,
  type ExecResult,
  type LogLevel,
  Scheduler,
  isObject,
  noop,
  toError,
} from '@andrew_l/toolkit';
import * as cp from 'node:child_process';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import { APP_INSTANCE_STATE, type AppInstance } from './app.ts';
import { type LogEventFields, formatLogEvent } from './utils/log.ts';

const MAX_RESTARTS = 3;
const HEARTBEAT_INTERVAL_MS = 5_000;
const HEARTBEAT_TIMEOUT_MS = 10_000;
const SHUTDOWN_EXIT_TIMEOUT_MS = 5_000;
const SHUTDOWN_REPLY_TIMEOUT_MS = 30_000;

const appModulePath = import.meta.url.endsWith('.ts')
  ? new URL('./index.js', import.meta.url).href
  : import.meta.url;

const bootstrapCode = `
import { delay } from '@andrew_l/toolkit'
import { processGraceful, onShutdown, onShutdownError } from '@andrew_l/graceful'
import process from 'node:process';

const scriptFile = process.env.VRUN_PROCESS_SCRIPT_FILE;
const threadId = parseInt(process.env.VRUN_PROCESS_ID, 10);
const appUrl = ${JSON.stringify(appModulePath)};

if (
  scriptFile.endsWith('.ts') ||
  appUrl.endsWith('.ts') ||
  appUrl.includes('/src/')
) {
  const { register } = await import('tsx/esm/api');
  register();
}

const { isAppDefinition, createAppThreadInstance, shutdownApp } = await import(appUrl);

const definition = await import(scriptFile).then(r => r.default);

if (!isAppDefinition(definition)) {
  throw new Error('Default export must be an app definition: ' + scriptFile);
}

const listeners = new Set();
const port = {
  on(event, cb) {
    if (event === 'message') {
      process.on('message', cb);
      listeners.add(cb);
    }
  },
  postMessage(msg, cb) {
    process.send(msg, cb);
  },
  close() {
    for (const cb of listeners) process.off('message', cb);
  },
};

const app = createAppThreadInstance({
  threadId,
  definition,
  parentPort: port,
  // onShutdown: () => processGraceful()
});

const log = app.logger;

onShutdownError((error) => {
  log.error('Shutdown error:', error);
});

onShutdown('app', async () => {
  log.info('Shutdown signal received');
  await shutdownApp(app);
});
`;

/**
 * @group Types
 */
export namespace ManagedThread {
  export type State = AppInstance.State | 'ready';

  export interface LogEntry {
    ts: number;
    level: LogLevel;
    text: string;
  }

  export type EventMap = {
    ready: [];
    state: [newState: State, oldState: State];
    log: [entry: LogEntry];
    pid: [pid: number];
    exit: [code: number | null, signal: NodeJS.Signals | null];
    message: [message: ManagedThread.ThreadMessage];
    error: [err: Error];
  } & {
    [K in ManagedThread.ThreadMessage as `msg:${K['type']}`]: [msg: K];
  };

  export type ThreadMessage =
    | ThreadMessage.AppState
    | ThreadMessage.Ping
    | ThreadMessage.Pong
    | ThreadMessage.Ready
    | ThreadMessage.Shutdown
    | ThreadMessage.ShutdownDone
    | ThreadMessage.Start
    | ThreadMessage.StartDone
    | ThreadMessage.Setup
    | ThreadMessage.SetupDone
    | ThreadMessage.Stop
    | ThreadMessage.StopDone;

  export type ThreadMessageMap = {
    [K in ManagedThread.ThreadMessage as K['type']]: K;
  };

  export type ThreadMessageDone<T extends string> =
    `${T}_done` extends keyof ThreadMessageMap ? `${T}_done` : never;

  export namespace ThreadMessage {
    export interface Base<T extends string> {
      type: T;
      vrun_app_thread_message: true;
    }

    export type AppState = Base<'app-state'> & {
      state: AppInstance.State;
    };

    export type Start = Base<'start'>;
    export type StartDone = Base<'start_done'> & { result: ExecResult };

    export type Setup = Base<'setup'> & { props: Data };
    export type SetupDone = Base<'setup_done'> & { result: ExecResult };

    export type Stop = Base<'stop'>;
    export type StopDone = Base<'stop_done'> & { result: ExecResult };

    export type Shutdown = Base<'shutdown'>;
    export type ShutdownDone = Base<'shutdown_done'> & { result: ExecResult };

    export type Ping = Base<'ping'>;
    export type Pong = Base<'pong'>;

    export type Ready = Base<'ready'> & {
      pid: number;
    };
  }
}

/**
 * A child process managed by the parent.
 * @group Types
 */
export interface ManagedThread {
  child: cp.ChildProcess;
  threadId: number;
  pid: number;
  state: ManagedThread.State;
  restartCount: number;
  scriptFile: string;
  threadProps: Record<string, unknown>;
  eventBus: EventEmitter<ManagedThread.EventMap>;
  scheduler: Scheduler;

  writeLog(level: LogLevel, event: string, fields?: LogEventFields): void;

  /** @internal */ heartbeatTimer?: NodeJS.Timeout;
  /** @internal */ lastPong: number;
}

function setState(w: ManagedThread, next: ManagedThread.State): void {
  const prev = w.state;
  if (prev === next) return;
  w.state = next;
  w.writeLog('debug', 'state', { from: prev, to: next });
  w.eventBus.emit('state', next, prev);
}

function spawnChild(w: ManagedThread): void {
  w.writeLog('debug', 'thread.spawn.start', {
    script: path.basename(w.scriptFile),
    thread: w.threadId,
  });
  setState(w, 'init');

  const child = cp.spawn(
    process.execPath,
    ['--input-type=module', '-e', bootstrapCode],
    {
      stdio:
        w.threadProps.__inheritIO !== false
          ? ['pipe', 'inherit', 'inherit', 'ipc']
          : ['pipe', 'pipe', 'pipe', 'ipc'],
      env: {
        ...process.env,
        VRUN_PROCESS_SCRIPT_FILE: w.scriptFile,
        VRUN_PROCESS_ID: String(w.threadId),
      },
    },
  );
  w.child = child;

  const onData = (chunk: Buffer | string) => {
    const text = chunk.toString('utf8');
    for (const line of text.split(/\r?\n/)) {
      if (line.length === 0) continue;
      w.eventBus.emit('log', parseRawLogLine(line));
    }
  };
  child.stdout?.on('data', onData);
  child.stderr?.on('data', onData);

  child.on('message', (msg: unknown) => {
    if (isThreadMessage(msg)) {
      w.eventBus.emit('message', msg);
      w.eventBus.emit(`msg:${msg.type}` as any, msg);
    }
  });

  child.once('exit', (code, signal) => {
    w.eventBus.emit('exit', code, signal);
  });

  child.on('error', err => {
    w.writeLog('error', 'thread.spawn.error', { message: err.message });
    w.eventBus.emit('error', err);
  });
}

function startHeartbeat(w: ManagedThread): void {
  w.lastPong = Date.now();
  w.heartbeatTimer = setInterval(() => {
    if (w.state !== APP_INSTANCE_STATE.RUN) {
      clearInterval(w.heartbeatTimer);
      return;
    }
    const since = Date.now() - w.lastPong;
    if (since > HEARTBEAT_TIMEOUT_MS) {
      clearInterval(w.heartbeatTimer);
      w.writeLog('warn', 'heartbeat.miss', { since_ms: since });
      restartThreadApp(w).catch(err => w.eventBus.emit('error', err));
      return;
    }
    if (w.child.connected) {
      w.child.send(createThreadMessage('ping', {}));
    }
  }, HEARTBEAT_INTERVAL_MS);
}

function waitForExit(w: ManagedThread, timeoutMs: number): Promise<void> {
  if (isThreadExit(w)) {
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    w.writeLog('info', 'thread.exit.waiting', { timeout_ms: timeoutMs });

    const cleanup = () => {
      clearTimeout(slowTimer);
      clearTimeout(killTimer);
      w.child.off('exit', onExit);
    };

    const onExit = () => {
      cleanup();
      resolve();
    };

    const halfway = Math.floor(timeoutMs / 2);

    const slowTimer = setTimeout(() => {
      w.writeLog('warn', 'thread.exit.slow', { elapsed_ms: halfway });
    }, halfway);

    const killTimer = setTimeout(() => {
      cleanup();
      try {
        w.writeLog('warn', 'thread.exit.force-kill', { timeout_ms: timeoutMs });
        w.child.kill('SIGKILL');
      } catch {}
      resolve();
    }, timeoutMs);

    w.child.once('exit', onExit);
  });
}

/**
 * Wait for thread ready signal
 * @group Threads
 */
export function waitForThreadReady(w: ManagedThread): Promise<void> {
  if (w.state === 'ready') {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      w.eventBus.off('ready', onReady);
      w.eventBus.off('error', onError);
      w.eventBus.off('exit', onExit);
    };

    const onReady = () => {
      resolve();
      cleanup();
    };

    const onExit = (code: number | null) => {
      reject(new Error(`Child exited before ready (code=${code ?? 'null'})`));
      cleanup();
    };

    const onError = (error: Error) => {
      reject(error);
      cleanup();
    };

    w.eventBus.once('ready', onReady);
    w.eventBus.once('error', onError);
    w.eventBus.once('exit', onExit);
  });
}

function sendAndWait<T extends ManagedThread.ThreadMessage>(
  w: ManagedThread,
  message: T,
  replyType: ManagedThread.ThreadMessageDone<T['type']>,
  timeout = 30_000,
): Promise<
  ExecResult<{
    reply: ManagedThread.ThreadMessageMap[ManagedThread.ThreadMessageDone<
      T['type']
    >];
  }>
> {
  return new Promise(resolve => {
    const eventName = `msg:${replyType}`;
    const cleanup = () => {
      w.eventBus.off(eventName as any, onReply);
      w.eventBus.off('exit', onExit);
      clearTimeout(timer);
    };

    const timer = setTimeout(() => {
      cleanup();
      w.writeLog('error', 'parent.ipc.timeout', {
        waiting: replyType,
        ms: timeout,
      });
      resolve({
        skip: true,
        code: 'parent.ipc.timeout',
        reason: `Thread ${path.basename(w.scriptFile)} timed out waiting for "${replyType}"`,
      });
    }, timeout);

    const onReply = (reply: ManagedThread.ThreadMessage) => {
      cleanup();
      resolve({
        success: true,
        code: 'parent.ipc.recv',
        reply: reply as any,
      });
    };

    const onExit = () => {
      const reason = `thread.exit (code=${w.child.exitCode} signal=${w.child.signalCode ?? 'null'})`;
      w.writeLog('debug', 'parent.ipc.skipped', {
        waiting: replyType,
        reason,
      });
      resolve({ skip: true, code: 'thread.exit', reason });
      return;
    };

    if (isThreadExit(w)) {
      return void onExit();
    }

    w.eventBus.once('exit', onExit);
    w.eventBus.once(eventName as any, onReply);
    w.writeLog('debug', 'parent.ipc.send', message);

    try {
      w.child.send(message);
    } catch (err) {
      const error = toError(err);
      w.writeLog('error', 'parent.ipc.fail', {
        message,
        error: error.message,
      });
      cleanup();
      resolve({
        skip: true,
        code: 'parent.ipc.fail',
        reason: error.message,
      });
    }
  });
}

/**
 * Spawn a child process for `scriptFile` and return its {@link ManagedThread}
 * immediately — synchronously, before the child signals readiness.
 * @group Threads
 */
export function initThread(
  threadId: number,
  scriptFile: string,
  threadProps: Record<string, unknown>,
): ManagedThread {
  const w: ManagedThread = {
    threadId,
    scriptFile,
    threadProps,
    pid: 0,
    state: APP_INSTANCE_STATE.INIT,
    restartCount: 0,
    lastPong: 0,
    child: null as any,
    scheduler: new Scheduler(),
    eventBus: new EventEmitter(),

    writeLog(level, event, fields) {
      w.eventBus.emit('log', {
        level,
        text: formatLogEvent(event, fields),
        ts: Date.now(),
      });
    },
  };

  w.eventBus.setMaxListeners(0);

  const onJobPhase =
    (phase: string) =>
    (job: Scheduler.JobOptions): void => {
      w.writeLog('debug', `job.${job.jobName ?? 'untitled'}.${phase}`);
    };

  w.scheduler.onJob(onJobPhase('queue'));
  w.scheduler.onJobStart(onJobPhase('start'));
  w.scheduler.onJobComplete(onJobPhase('done'));

  w.eventBus.on('exit', (code, signal) => {
    const prevState = w.state;

    if (signal) {
      w.writeLog('warn', 'thread.exit.signal', { signal, code });
    } else if (code === 0 || code === null) {
      w.writeLog('info', 'thread.exit.clean', { code });
    } else {
      w.writeLog('error', 'thread.exit.crash', { code });
    }

    setState(w, 'shutdown');
    clearInterval(w.heartbeatTimer);
    w.pid = 0;

    if (prevState === APP_INSTANCE_STATE.RUN && !isShuttingDown()) {
      restartThreadApp(w).catch(err => w.eventBus.emit('error', err));
    }
  });

  w.eventBus.on('message', msg => {
    w.writeLog('debug', 'parent.ipc.recv', msg);

    switch (msg.type) {
      case 'app-state': {
        setState(w, msg.state);
        break;
      }

      case 'ready': {
        w.pid = msg.pid;
        w.eventBus.emit('pid', msg.pid);
        setState(w, 'ready');
        w.writeLog('debug', 'thread.spawn.ready');
        w.eventBus.emit('ready');
        break;
      }

      case 'pong': {
        w.lastPong = Date.now();
        break;
      }
    }
  });

  spawnChild(w);

  return w;
}

function withLifecycle<T>(
  w: ManagedThread,
  phase: string,
  fn: () => Promise<T>,
): Promise<T> {
  w.writeLog('debug', `lifecycle.${phase}.begin`);
  return fn().then(
    result => {
      w.writeLog('debug', `lifecycle.${phase}.done`);
      return result;
    },
    error => {
      w.writeLog('error', `lifecycle.${phase}.fail`, {
        message: String((error && error.message) || error),
      });
      throw error;
    },
  );
}

/**
 * Send the setup message; resolves when child replies setup_done.
 * @group Threads
 */
export function setupThreadApp(w: ManagedThread): Promise<void> {
  return w.scheduler.queueJobWait(
    () => withLifecycle(w, 'setupThreadApp', () => doSetupThread(w)),
    { jobName: 'setupThreadApp' },
  );
}

function doSetupThread(w: ManagedThread): Promise<void> {
  setState(w, APP_INSTANCE_STATE.IN_SETUP);
  return sendAndWait(
    w,
    createThreadMessage('setup', {
      props: w.threadProps,
    }),
    'setup_done',
  ).then(noop);
}

/**
 * Send the start message; on reply, switch to running and arm heartbeat.
 * @group Threads
 */
export function startThreadApp(w: ManagedThread): Promise<void> {
  return w.scheduler.queueJobWait(
    () => withLifecycle(w, 'startThreadApp', () => doStartThreadApp(w)),
    { jobName: 'startThreadApp' },
  );
}

function doStartThreadApp(w: ManagedThread): Promise<void> {
  setState(w, APP_INSTANCE_STATE.IN_RUN);
  return sendAndWait(w, createThreadMessage('start', {}), 'start_done').then(
    () => {
      if (w.state === APP_INSTANCE_STATE.RUN) {
        startHeartbeat(w);
      }
    },
  );
}

/**
 * Send the stop message; child keeps running, app inside is stopped.
 * @group Threads
 */
export function stopThreadApp(w: ManagedThread): Promise<void> {
  return w.scheduler.queueJobWait(
    () => withLifecycle(w, 'stopThreadApp', () => doStopThreadApp(w)),
    { jobName: 'stopThreadApp' },
  );
}

function doStopThreadApp(w: ManagedThread): Promise<void> {
  setState(w, APP_INSTANCE_STATE.IN_STOP);
  clearInterval(w.heartbeatTimer);
  return sendAndWait(w, createThreadMessage('stop', {}), 'stop_done').then(
    noop,
  );
}

/**
 * Send shutdown and wait for the OS process to exit (SIGKILL fallback).
 * @group Threads
 */
export function shutdownThreadApp(w: ManagedThread): Promise<void> {
  return w.scheduler.queueJobWait(
    () => withLifecycle(w, 'shutdownThreadApp', () => doShutdownThreadApp(w)),
    { jobName: 'shutdownThreadApp' },
  );
}

function doShutdownThreadApp(w: ManagedThread): Promise<void> {
  setState(w, 'shutdown');
  clearInterval(w.heartbeatTimer);

  return (
    w.child.connected
      ? sendAndWait(
          w,
          createThreadMessage('shutdown', {}),
          'shutdown_done',
          SHUTDOWN_REPLY_TIMEOUT_MS,
        )
      : Promise.resolve()
  ).then(() => waitForExit(w, SHUTDOWN_EXIT_TIMEOUT_MS));
}

/**
 * Terminate the child and spawn a fresh one with the same script + props.
 * @group Threads
 */
export function restartThreadApp(w: ManagedThread): Promise<void> {
  if (w.restartCount >= MAX_RESTARTS) {
    return Promise.reject(
      new Error(`Thread ${w.threadId} exceeded max restarts (${MAX_RESTARTS})`),
    );
  }

  return w.scheduler.queueJobWait(
    () =>
      withLifecycle(w, 'restartThreadApp', () =>
        doShutdownThreadApp(w)
          .then(() => {
            w.restartCount++;
            spawnChild(w);
            return waitForThreadReady(w);
          })
          .then(() => doSetupThread(w))
          .then(() => doStartThreadApp(w)),
      ),
    { jobName: 'restartThreadApp' },
  );
}

export function isThreadMessage(
  value: unknown,
): value is ManagedThread.ThreadMessage {
  return isObject(value) && !!(value as any).vrun_app_thread_message;
}

export function createThreadMessage<
  T extends keyof ManagedThread.ThreadMessageMap,
>(
  type: T,
  msg: Omit<
    ManagedThread.ThreadMessageMap[T],
    'type' | 'vrun_app_thread_message'
  >,
): ManagedThread.ThreadMessageMap[T] {
  return {
    type,
    ...msg,
    vrun_app_thread_message: true,
  } as any;
}

function parseRawLogLine(line: string): ManagedThread.LogEntry {
  const trimmed = line.trimEnd();
  const lower = trimmed.toLowerCase();
  let level: LogLevel = 'info';
  if (
    lower.includes('error') ||
    lower.includes('✖') ||
    lower.includes('[error]')
  ) {
    level = 'error';
  } else if (lower.includes('warn') || lower.includes('⚠')) {
    level = 'warn';
  } else if (lower.includes('debug') || lower.includes('⚙')) {
    level = 'debug';
  }
  return { ts: Date.now(), level, text: trimmed };
}

export function isThreadExit(w: ManagedThread): boolean {
  return (
    w.child.exitCode !== null ||
    w.child.signalCode !== null ||
    !w.child.connected
  );
}
