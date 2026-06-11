import { assert, isSkip } from '@andrew_l/toolkit';
import * as WorkerThreads from 'node:worker_threads';
import {
  type AppDefinition,
  type AppInstance,
  createAppInstance,
  defineApp,
  runApp,
  setupApp,
  shutdownApp,
  stopApp,
} from './app.ts';
import { log } from './logger.ts';

const MAX_RESTARTS = 3;
const HEARTBEAT_INTERVAL_MS = 5_000;
const HEARTBEAT_TIMEOUT_MS = 10_000;

interface ManagedWorker {
  worker: WorkerThreads.Worker;
  threadId: number;
  restartCount: number;
  state: 'initializing' | 'setup' | 'running' | 'stopping' | 'shutdown';
  lastPong: number;
  heartbeatTimer?: ReturnType<typeof setInterval>;
  readonly workerProps: Record<string, unknown>;
  readonly scriptFile: string;
}

function sendAndWait(
  worker: WorkerThreads.Worker,
  message: unknown,
  replyType: string,
  timeout = 30_000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.off('message', handler);
      reject(new Error(`Worker timed out waiting for "${replyType}"`));
    }, timeout);

    const handler = (msg: unknown) => {
      if (msg === replyType) {
        clearTimeout(timer);
        worker.off('message', handler);
        resolve();
      } else if (
        typeof msg === 'object' &&
        msg !== null &&
        (msg as any).type === `${replyType}_error`
      ) {
        clearTimeout(timer);
        worker.off('message', handler);
        reject(new Error((msg as any).error ?? 'Worker error'));
      }
    };

    worker.on('message', handler);
    worker.postMessage(message);
  });
}

function waitForWorkerReady(worker: WorkerThreads.Worker): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const onMessage = (msg: unknown) => {
      if (msg === 'vrun_app_thread:ready') {
        worker.off('message', onMessage);
        worker.off('error', onError);
        resolve();
      }
    };
    const onError = (err: Error) => {
      worker.off('message', onMessage);
      reject(err);
    };
    worker.on('message', onMessage);
    worker.once('error', onError);
  });
}

async function initWorker(
  threadId: number,
  scriptFile: string,
  workerProps: Record<string, unknown>,
  options?: Omit<WorkerThreads.WorkerOptions, 'workerData'>,
): Promise<ManagedWorker> {
  const worker = createThread({ threadId, scriptFile, options });
  await waitForWorkerReady(worker);
  return {
    worker,
    threadId,
    restartCount: 0,
    state: 'initializing',
    lastPong: Date.now(),
    workerProps,
    scriptFile,
  };
}

async function setupWorkerApp(managed: ManagedWorker): Promise<void> {
  await sendAndWait(
    managed.worker,
    { type: 'vrun_app_thread:setup', props: managed.workerProps },
    'vrun_app_thread:setup_done',
  );
  managed.state = 'setup';
}

async function startWorkerApp(managed: ManagedWorker): Promise<void> {
  await sendAndWait(
    managed.worker,
    'vrun_app_thread:start',
    'vrun_app_thread:start_done',
  );
  managed.state = 'running';
  watchWorker(managed);
  startHeartbeat(managed);
}

async function stopWorkerApp(managed: ManagedWorker): Promise<void> {
  managed.state = 'stopping';
  clearInterval(managed.heartbeatTimer);
  await sendAndWait(
    managed.worker,
    'vrun_app_thread:stop',
    'vrun_app_thread:stop_done',
  );
}

async function shutdownWorkerApp(managed: ManagedWorker): Promise<void> {
  managed.state = 'shutdown';
  clearInterval(managed.heartbeatTimer);
  await sendAndWait(
    managed.worker,
    'vrun_app_thread:shutdown',
    'vrun_app_thread:shutdown_done',
  );
  await managed.worker.terminate();
}

function startHeartbeat(managed: ManagedWorker): void {
  managed.lastPong = Date.now();

  managed.worker.on('message', (msg: unknown) => {
    if (msg === 'vrun_app_thread:pong') managed.lastPong = Date.now();
  });

  managed.heartbeatTimer = setInterval(() => {
    if (managed.state !== 'running') {
      clearInterval(managed.heartbeatTimer);
      return;
    }
    if (Date.now() - managed.lastPong > HEARTBEAT_TIMEOUT_MS) {
      clearInterval(managed.heartbeatTimer);
      managed.state = 'shutdown';
      managed.worker.terminate();
      restartWorker(managed).catch(err =>
        log.error(`Worker ${managed.threadId} restart failed:`, err),
      );
      return;
    }
    managed.worker.postMessage('vrun_app_thread:ping');
  }, HEARTBEAT_INTERVAL_MS);
}

function watchWorker(managed: ManagedWorker): void {
  managed.worker.once('exit', () => {
    if (managed.state === 'running') {
      managed.state = 'shutdown';
      clearInterval(managed.heartbeatTimer);
      restartWorker(managed).catch(err =>
        log.error(`Worker ${managed.threadId} restart failed:`, err),
      );
    }
  });
}

async function restartWorker(managed: ManagedWorker): Promise<void> {
  if (managed.restartCount >= MAX_RESTARTS) {
    throw new Error(
      `Worker ${managed.threadId} exceeded max restarts (${MAX_RESTARTS})`,
    );
  }

  const wasRunning = managed.state === 'running';
  managed.state = 'shutdown';
  clearInterval(managed.heartbeatTimer);
  try {
    await managed.worker.terminate();
  } catch {}

  const newWorker = createThread({
    threadId: managed.threadId,
    scriptFile: managed.scriptFile,
  });
  await waitForWorkerReady(newWorker);

  managed.worker = newWorker;
  managed.restartCount++;
  managed.lastPong = Date.now();
  managed.heartbeatTimer = undefined;

  await setupWorkerApp(managed);

  if (wasRunning) {
    await startWorkerApp(managed);
  }
}

/**
 * Wrap an app definition to run across N worker threads.
 * Adds a `threads` prop and manages the full lifecycle of each worker.
 * @group Internals
 */
export function createAppThread(definition: AppDefinition): AppDefinition {
  const scriptFile = definition.filePath;

  assert.ok(
    definition.filePath,
    `Failed to detect definition file path for: ${definition.name}`,
  );

  const app = defineApp({
    name: definition.name,
    description: definition.description,
    props: {
      ...(definition.props || {}),
      threads: {
        type: Number,
        default: () => 1,
      },
    },
    logging: false,

    async setup(props) {
      const { threads, ...workerProps } = props as any;

      assert.greaterThan(threads, 0, 'threads expected to be greater than 0');

      const managedWorkers: ManagedWorker[] = await Promise.all(
        Array.from({ length: threads }, (_, i) =>
          initWorker(i + 1, scriptFile!, workerProps),
        ),
      );

      await Promise.all(managedWorkers.map(m => setupWorkerApp(m)));

      return { managedWorkers };
    },

    async entry() {
      await Promise.all(
        this.managedWorkers.map((m: ManagedWorker) => startWorkerApp(m)),
      );
    },

    async stop() {
      await Promise.all(
        this.managedWorkers.map((m: ManagedWorker) => stopWorkerApp(m)),
      );
    },

    async shutdown() {
      await Promise.all(
        this.managedWorkers.map((m: ManagedWorker) => shutdownWorkerApp(m)),
      );
      this.managedWorkers.length = 0;
    },
  });

  return app;
}

/**
 * @group Internals
 */
export interface StartAppThreadParams {
  definition: AppDefinition;
  parentPort: WorkerThreads.MessagePort;
  threadId: number;
}

/**
 * Worker-side bootstrap: attach the message protocol listener on `parentPort`
 * and signal the parent that this thread is ready.
 * @group Internals
 */
export async function createAppThreadInstance({
  definition,
  parentPort,
  threadId,
}: StartAppThreadParams): Promise<AppInstance> {
  definition = { ...definition };
  definition.name += '.' + threadId;

  const instance = createAppInstance(definition);

  parentPort.on('message', async message => {
    if (typeof message === 'object' && message !== null) {
      switch (message.type) {
        case 'vrun_app_thread:setup': {
          const result = await setupApp(instance, message.props);
          if (isSkip(result)) {
            parentPort.postMessage({
              type: 'vrun_app_thread:setup_done_error',
              error: result.reason,
            });
          } else {
            parentPort.postMessage('vrun_app_thread:setup_done');
          }
          return;
        }
      }
      return;
    }

    switch (message) {
      case 'vrun_app_thread:start': {
        await runApp(instance);
        parentPort.postMessage('vrun_app_thread:start_done');
        break;
      }
      case 'vrun_app_thread:stop': {
        await stopApp(instance);
        parentPort.postMessage('vrun_app_thread:stop_done');
        break;
      }
      case 'vrun_app_thread:shutdown': {
        await shutdownApp(instance);
        parentPort.postMessage('vrun_app_thread:shutdown_done');
        break;
      }
      case 'vrun_app_thread:ping': {
        parentPort.postMessage('vrun_app_thread:pong');
        break;
      }
    }
  });

  parentPort.postMessage('vrun_app_thread:ready');

  return instance;
}

const appModulePath = process.env.VITEST
  ? new URL('./index.js', import.meta.url).href // → src/index.ts
  : '@andrew_l/app';

const code = `
import { parentPort, workerData } from "node:worker_threads";
import { assert } from '@andrew_l/toolkit';

const { scriptFile, threadId } = workerData.vrun_app_thread || {};

if (scriptFile.endsWith('.ts')) {
  const { register } = await import('tsx/esm/api');
  register();
}

const { isAppDefinition, createAppThreadInstance } = await import('${appModulePath}');

const definition = await import(scriptFile).then((r) => r.default);

assert.ok(isAppDefinition(definition), 'Default export must be an app definition: ' + scriptFile);

const app = await createAppThreadInstance({
  threadId,
  definition,
  parentPort
});
`;

/**
 * @group Internals
 */
export interface CreateThreadParams {
  threadId: number;
  scriptFile: string;
  options?: Omit<WorkerThreads.WorkerOptions, 'workerData'>;
}

/**
 * Spawn a raw worker thread running the app thread bootstrap script.
 * @group Internals
 */
export function createThread({
  threadId,
  scriptFile,
  options,
}: CreateThreadParams): WorkerThreads.Worker {
  return new WorkerThreads.Worker(code, {
    ...(options ?? {}),
    eval: true,
    workerData: {
      vrun_app_thread: {
        threadId,
        scriptFile,
      },
    },
  });
}
