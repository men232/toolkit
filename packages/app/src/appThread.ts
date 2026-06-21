import { assert, catchError, isFunction, noop } from '@andrew_l/toolkit';
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
import {
  type ManagedThread,
  createThreadMessage,
  initThread,
  isThreadMessage,
  setupThreadApp,
  shutdownThreadApp,
  startThreadApp,
  stopThreadApp,
  waitForThreadReady,
} from './managedThread.ts';
import { createAppLogger, formatLogEvent } from './utils/log.ts';

/**
 * Wrap an app definition to run across N child processes. Adds a
 * `threads` prop and manages the full lifecycle of each child.
 * @group Types
 */
export function createAppThread(definition: AppDefinition): AppDefinition {
  const scriptFile = definition.filePath;

  assert.ok(
    scriptFile,
    `Failed to detect definition file path for: ${definition.name}`,
  );

  const app = defineApp({
    name: definition.name,
    description: definition.description,
    props: {
      ...(definition.props || {}),
      threads: {
        type: Number,
        description: 'Amount of threads',
        default: () => 1,
        parser: v => parseInt(v),
      },
    },

    logger: false,

    setup(props) {
      const { threads = 1, ...threadProps } = props;

      assert.greaterThan(threads, 0, 'threads expected to be greater than 0');

      const managedThreads: ManagedThread[] = Array.from(
        { length: threads },
        (_, i) => initThread(i + 1, scriptFile, threadProps),
      );

      // Write child logs into parent process
      if ((props as any).__inheritIO !== false) {
        for (const w of managedThreads) {
          const childLogger = createAppLogger({
            ...definition,
            name: `${definition.name}.${w.threadId}`,
          });

          w.eventBus.on('log', entry => {
            childLogger[entry.level](entry.text);
          });
        }
      }

      return Promise.all(managedThreads.map(w => waitForThreadReady(w)))
        .then(() => Promise.all(managedThreads.map(w => setupThreadApp(w))))
        .then(() => ({ managedThreads }));
    },

    entry() {
      return Promise.all(this.managedThreads.map(w => startThreadApp(w))).then(
        noop,
      );
    },

    stop() {
      return Promise.all(this.managedThreads.map(w => stopThreadApp(w))).then(
        noop,
      );
    },

    shutdown() {
      return Promise.all(
        this.managedThreads.map(w => shutdownThreadApp(w)),
      ).then(() => {
        this.managedThreads = [];
      });
    },
  });

  return app;
}

export interface CreateAppThreadInstanceParams {
  definition: AppDefinition;
  parentPort: ParentPortLike;
  threadId: number;
  onShutdown?: () => void;
}

/**
 * A minimal port abstraction implemented by both IPC `MessagePort`
 * and the `process`-based shim spawned by {@link initThread}.
 * @group Types
 */
export interface ParentPortLike {
  on(event: 'message', cb: (msg: unknown) => void): unknown;
  postMessage(msg: unknown, cb?: () => void): unknown;
  close?(): unknown;
}

/**
 * Create app instance with IPC fully managed lifecycle
 * @group Threads
 */
export function createAppThreadInstance({
  definition,
  parentPort,
  threadId,
  onShutdown = noop,
}: CreateAppThreadInstanceParams): AppInstance {
  definition = { ...definition };
  definition.name += '.' + threadId;

  const instance = createAppInstance(definition);
  const log = instance.logger;

  const postMessage = (
    message: ManagedThread.ThreadMessage,
    cb?: () => void,
  ) => {
    log.debug(formatLogEvent('child.ipc.send', message));
    parentPort.postMessage(message, cb);
  };

  instance.eventBus.on('state', newState => {
    postMessage(createThreadMessage('app-state', { state: newState }));
  });

  parentPort.on('message', async message => {
    if (!isThreadMessage(message)) return;

    log.debug(formatLogEvent('child.ipc.recv', message));

    switch (message.type) {
      case 'setup': {
        const result = await setupApp(instance, message.props);
        postMessage(createThreadMessage('setup_done', { result }));
        break;
      }

      case 'start': {
        const result = await runApp(instance);
        postMessage(createThreadMessage('start_done', { result }));
        break;
      }
      case 'stop': {
        const result = await stopApp(instance);
        postMessage(createThreadMessage('stop_done', { result }));
        break;
      }
      case 'shutdown': {
        const result = await shutdownApp(instance);
        postMessage(createThreadMessage('shutdown_done', { result }), () => {
          setImmediate(() => {
            catchError(onShutdown);
            if (isFunction(parentPort.close)) {
              parentPort.close!();
            }
          });
        });
        break;
      }
      case 'ping': {
        postMessage(createThreadMessage('pong', {}));
        break;
      }
    }
  });

  postMessage(
    createThreadMessage('ready', {
      pid: process.pid,
    }),
  );

  return instance;
}
