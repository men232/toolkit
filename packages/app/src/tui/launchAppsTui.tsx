import {
  onShutdown,
  onShutdownError,
  processGraceful,
} from '@andrew_l/graceful';
import {
  type Data,
  defer,
  isNumber,
  noop
} from '@andrew_l/toolkit';
import { render } from 'ink';
import { APP_INSTANCE_STATE, type AppDefinition } from '../app.ts';
import { getPrefixedProps } from '../appHub.ts';
import {
  type ManagedThread,
  initThread,
  restartThreadApp,
  setupThreadApp,
  shutdownThreadApp,
  startThreadApp,
  stopThreadApp,
  waitForThreadReady,
} from '../managedThread.ts';
import { TuiRoot } from './components/TuiRoot.tsx';
import { type AppNode, type ThreadNode, createTuiStore } from './store.ts';

interface AppRecord {
  appId: string;
  node: AppNode;
  threads: ManagedThread[];
}

function getAppProps(
  definition: AppDefinition,
  props: Data,
  isSingle: boolean,
): Data {
  if (isSingle) return { ...props };

  return getPrefixedProps(definition, props);
}

function appIdFor(definition: AppDefinition, idx: number): string {
  return `${definition.name}#${idx}`;
}

function resolveThreadCount(appProps: Data): number {
  if (isNumber(appProps.threads) && appProps.threads > 0) {
    return appProps.threads;
  }
  return 1;
}

const APP_STATE_RANK: Record<ManagedThread.State, number> = {
  error: 10,
  run: 9,
  'in-run': 8,
  setup: 7,
  'in-setup': 6,
  stop: 5,
  'in-stop': 4,
  shutdown: 3,
  'in-shutdown': 2,
  ready: 1,
  init: 0,
};

function aggregateAppState(threads: ManagedThread[]): ManagedThread.State {
  let best: ManagedThread.State = 'init';
  for (const w of threads) {
    const s = APP_STATE_RANK[w.state];
    if (s > APP_STATE_RANK[best]) best = w.state;
  }
  return best;
}

export function launchAppsTui(
  definitions: AppDefinition[],
  props: Record<string, any>,
): Promise<void> {
  const store = createTuiStore();
  const records: AppRecord[] = [];
  const isSingle = definitions.length === 1;

  if (props.watch) {
    store.setSystem({
      ts: Date.now(),
      level: 'warn',
      text: 'TUI does not yet support --watch mode;',
    });
  }

  for (let i = 0; i < definitions.length; i++) {
    const def = definitions[i];
    const appId = appIdFor(def, i);
    const appProps = getAppProps(def, props, isSingle);
    const threadCount = resolveThreadCount(appProps);
    appProps.__inheritIO = false;
    delete appProps.threads;

    const appNode: AppNode = {
      kind: 'app',
      id: appId,
      name: def.name,
      state: APP_INSTANCE_STATE.INIT,
      expanded: false,
      threads: [],
    };
    store.addApp(appNode);

    const threads: ManagedThread[] = [];
    const threadNodes: ThreadNode[] = [];

    for (let threadId = 1; threadId <= threadCount; threadId++) {
      const nodeId = `${appId}:${threadId}`;
      const threadNode: ThreadNode = {
        id: `${appId}:${threadId}`,
        kind: 'thread',
        name: `${appNode.name}.${threadId}`,
        parentId: appId,
        threadId: threadId,
        pid: 0,
        state: APP_INSTANCE_STATE.INIT,
      };
      threadNodes.push(threadNode);

      const w = initThread(threadId, def.filePath!, appProps);
      w.eventBus.on('log', (entry: ManagedThread.LogEntry) => {
        store.pushLog(nodeId, {
          ts: entry.ts,
          level: entry.level,
          text: entry.text,
        });
      });
      w.eventBus.on('state', (newState: ManagedThread.State) => {
        store.setState(nodeId, newState);
        store.setState(appId, aggregateAppState(threads));
      });
      w.eventBus.on('pid', (pid: number) => {
        store.setPid(nodeId, pid);
      });
      w.eventBus.on('error', err => {
        store.pushLog(nodeId, {
          ts: Date.now(),
          level: 'error',
          text: `Thread error: ${err.message}`,
        });
      });
      threads.push(w);
    }

    store.setThreads(appId, threadNodes);

    records.push({ appId, node: appNode, threads: threads });
  }

  const findRecordByAppId = (id: string): AppRecord | undefined =>
    records.find(r => r.appId === id);

  const findThread = (
    id: string,
  ): { record: AppRecord; thread: ManagedThread } | undefined => {
    for (const r of records) {
      for (const w of r.threads) {
        if (`${r.appId}:${w.threadId}` === id) return { record: r, thread: w };
      }
    }
    return undefined;
  };

  const clearAppLogs = (r: AppRecord): void => {
    store.clearLogs(r.appId);
    for (const t of r.node.threads ?? []) store.clearLogs(t.id);
  };

  const startSingleThread = (w: ManagedThread): Promise<void> => {
    if (w.state === APP_INSTANCE_STATE.IN_RUN || APP_INSTANCE_STATE.RUN) {
      return Promise.resolve();
    }

    if (w.state === APP_INSTANCE_STATE.STOP) return startThreadApp(w);
    return setupThreadApp(w).then(() => startThreadApp(w));
  };

  store.handlers = {
    stop(id) {
      const r = findRecordByAppId(id);
      if (r)
        return Promise.all(r.threads.map(w => stopThreadApp(w))).then(() => {});
      const found = findThread(id);
      if (found) return stopThreadApp(found.thread);
      return Promise.resolve();
    },
    start(id) {
      const r = findRecordByAppId(id);
      if (r) {
        return Promise.all(r.threads.map(startSingleThread)).then(() => {});
      }
      const found = findThread(id);
      if (found) return startSingleThread(found.thread);
      return Promise.resolve();
    },
    restart(id) {
      const r = findRecordByAppId(id);
      if (r) {
        return Promise.all(
          r.threads.map(w => {
            w.restartCount = 0;
            return restartThreadApp(w);
          }),
        ).then(() => {});
      }
      const found = findThread(id);
      if (found) {
        found.thread.restartCount = 0;
        return restartThreadApp(found.thread);
      }
      return Promise.resolve();
    },
  };

  const startRecord = (r: AppRecord): Promise<void> =>
    Promise.all(
      r.threads.map(w =>
        waitForThreadReady(w)
          .then(() => setupThreadApp(w))
          .then(() => startThreadApp(w)),
      ),
    ).then(noop);

  onShutdownError(error => {
    console.error('[Graceful Shutdown] error:', error);
  });

  const q = defer<void>();

  onShutdown('app', () => {
    store.setSystem({
      ts: Date.now(),
      level: 'warn',
      text: 'shutdown initiated',
    });

    return Promise.all(
      records.map(r => Promise.all(r.threads.map(w => shutdownThreadApp(w)))),
    )
      .then(() => {
        store.setSystem({
          ts: Date.now(),
          level: 'info',
          text: 'shutdown complete',
        });
      })
      .then(() => inkInstance.waitUntilRenderFlush())
      .then(() => inkInstance.unmount())
      .then(() => q.resolve())
      .catch(console.error);
  });

  const onExit = () => {
    return Promise.resolve().then(() => processGraceful());
  };

  const inkInstance = render(<TuiRoot store={store} onExit={onExit} />, {
    exitOnCtrlC: false,
  });

  return Promise.all(records.map(startRecord)).then(() => q.promise);
}
