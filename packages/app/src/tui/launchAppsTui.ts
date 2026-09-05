import {
  onShutdown,
  onShutdownError,
  processGraceful,
} from '@andrew_l/graceful';
import { type Data, isNumber, noop } from '@andrew_l/toolkit';
import { createApp } from '@andrew_l/vue-stdout';
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
import TuiRoot from './components/TuiRoot.vue';
import { createTuiStore } from './store.ts';
import type { AppNode, LifecycleHandlers, ThreadNode } from './types.ts';

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
  const records: AppRecord[] = [];
  const isSingle = definitions.length === 1;

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

  const startSingleThread = (w: ManagedThread): Promise<void> => {
    if (w.state === APP_INSTANCE_STATE.IN_RUN || APP_INSTANCE_STATE.RUN) {
      return Promise.resolve();
    }

    if (w.state === APP_INSTANCE_STATE.STOP)
      return startThreadApp(w).then(noop);
    return setupThreadApp(w)
      .then(() => startThreadApp(w))
      .then(noop);
  };

  // Built before the store because the store takes them as a dependency. They
  // close over `records`, which the loop below fills in, and nothing calls them
  // until a keypress -- long after that loop has run.
  const handlers: LifecycleHandlers = {
    stop(id) {
      const r = findRecordByAppId(id);
      if (r)
        return Promise.all(r.threads.map(w => stopThreadApp(w))).then(() => {});
      const found = findThread(id);
      if (found) return stopThreadApp(found.thread).then(noop);
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
        return restartThreadApp(found.thread).then(noop);
      }
      return Promise.resolve();
    },
  };

  const store = createTuiStore(handlers);

  if (props.watch) {
    store.system.value = {
      ts: Date.now(),
      level: 'warn',
      text: 'TUI does not yet support --watch mode;',
    };
  }

  for (let i = 0; i < definitions.length; i++) {
    const def = definitions[i];
    const appId = appIdFor(def, i);
    const appProps = getAppProps(def, props, isSingle);
    const threadCount = resolveThreadCount(appProps);
    appProps.__inheritIO = false;
    delete appProps.threads;

    // `addApp` hands back the reactive proxy, and every mutation below goes
    // through it -- writing to the object literal instead would update nothing
    // on screen.
    const appNode = store.addApp({
      kind: 'app',
      id: appId,
      name: def.name,
      state: APP_INSTANCE_STATE.INIT,
      expanded: false,
      threads: [],
    });

    const threads: ManagedThread[] = [];
    const threadNodes: ThreadNode[] = [];

    for (let threadId = 1; threadId <= threadCount; threadId++) {
      threadNodes.push({
        id: `${appId}:${threadId}`,
        kind: 'thread',
        name: `${appNode.name}.${threadId}`,
        parentId: appId,
        threadId: threadId,
        pid: 0,
        state: APP_INSTANCE_STATE.INIT,
      });
    }

    appNode.threads = threadNodes;
    // Read back through the proxy, for the same reason as `appNode` above.
    const threadNodeProxies = appNode.threads!;

    for (let threadId = 1; threadId <= threadCount; threadId++) {
      const threadNode = threadNodeProxies[threadId - 1];
      const nodeId = threadNode.id;

      const w = initThread(threadId, def.filePath!, appProps);
      w.eventBus.on('log', (entry: ManagedThread.LogEntry) => {
        store.pushLog(nodeId, {
          ts: entry.ts,
          level: entry.level,
          text: entry.text,
        });
      });
      w.eventBus.on('state', (newState: ManagedThread.State) => {
        threadNode.state = newState;
        appNode.state = aggregateAppState(threads);
      });
      w.eventBus.on('pid', (pid: number) => {
        threadNode.pid = pid;
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

    records.push({ appId, node: appNode, threads: threads });
  }

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

  const onExit = () => {
    return Promise.resolve().then(() => processGraceful());
  };

  const tuiApp = createApp(TuiRoot, { store, onExit });

  onShutdown('app', () => {
    store.system.value = {
      ts: Date.now(),
      level: 'warn',
      text: 'shutdown initiated',
    };

    return Promise.all(
      records.map(r => Promise.all(r.threads.map(w => shutdownThreadApp(w)))),
    )
      .then(() => {
        store.system.value = {
          ts: Date.now(),
          level: 'info',
          text: 'shutdown complete',
        };
      })
      .then(() => tuiApp.unmount())
      .catch(console.error);
  });

  // `maxFps: 0` disables the write throttle: vue-stdout has no equivalent of
  // ink's `waitUntilRenderFlush()` (deliberately out of scope, see
  // `@andrew_l/vue-stdout`'s `useApp.ts`), so the "shutdown complete" message
  // above must land on an uncapped write instead of risking a throttled frame
  // that never gets to fire before `unmount()` tears the container down.
  tuiApp.mount({ exitOnCtrlC: false, maxFps: 0 });

  return Promise.all(records.map(startRecord)).then(() =>
    tuiApp.waitUntilExit(),
  );
}
