# Application Toolkit

[![npm version][npm-version-src]][npm-version-href]
![license][license-src]

Define application entry points with typed props, lifecycle hooks, and run them via the `vrun` CLI — no boilerplate config or argument parsing needed.

[Documentation](https://men232.github.io/toolkit/reference/@andrew_l/app/)

<!-- install placeholder -->

## 🚀 Example Usage

### Define an app

```ts
// server.app.ts
import { defineApp } from '@andrew_l/app';

export default defineApp({
  name: 'server',
  description: 'HTTP server',

  props: {
    port: {
      type: Number,
      default: () => 3000,
      description: 'Port to listen on',
    },
    host: {
      type: String,
      default: () => '0.0.0.0',
      env: 'HOST',
    },
  },

  setup() {
    const server = createServer();
    return { server };
  },

  async entry(props) {
    await this.server.listen(props.port, props.host);
  },

  async stop() {
    await this.server.close();
  },
});
```

### Run with `vrun`

```bash
# Run a single app
vrun server.app.js

# Pass props as CLI flags
vrun server.app.js --port 8080

# TypeScript + watch mode (dev)
vrun server.app.ts --dev --watch

# Run across multiple worker threads
vrun server.app.js --threads 4

# Run multiple apps at once
vrun server.app.js worker.app.ts

# Interactively pick apps from a folder
vrun list ./apps

# Run all apps in a folder
vrun folder ./apps

# Run apps from a JSON manifest
vrun json apps.json
```

### Props

Props are declared per app and automatically wired to CLI flags and environment variables:

| Option     | Description                                                |
| ---------- | ---------------------------------------------------------- |
| `type`     | `String`, `Number`, `Boolean`, `Date` — drives CLI parsing |
| `default`  | Factory function for the default value                     |
| `env`      | Env variable name(s) to read from                          |
| `alias`    | Short CLI flag (e.g. `alias: 'p'` → `-p`)                  |
| `required` | Fail startup if the value is missing                       |
| `enum`     | Restrict to a set of string values                         |
| `parser`   | Custom string → value parser                               |

Prop names are converted to `--kebab-case` CLI flags automatically.

### Lifecycle

```
setup() → entry() → [running] → stop() → shutdown()
```

| Hook              | Called                                                               | `this` context        |
| ----------------- | -------------------------------------------------------------------- | --------------------- |
| `setup(props)`    | Once on startup — return an object to populate `this` in later hooks | `{}`                  |
| `entry(props)`    | Each time the app starts                                             | setup state + methods |
| `stop(props)`     | Each time the app stops                                              | setup state + methods |
| `shutdown(props)` | Before process exit                                                  | setup state + methods |

### Methods

Define reusable methods bound to the setup state:

```ts
export default defineApp({
  name: 'worker',
  methods: {
    greet(name: string) {
      console.log(`Hello, ${name}`);
    },
  },
  entry() {
    this.greet('world');
  },
});
```

## 🔁 Workers

Workers are long-running background processors driven by a pluggable **strategy**. The strategy controls when tasks are enqueued; the worker controls how many run in parallel and calls your `entry` function for each one.

### Define a worker

```ts
// clock.worker.ts
import { IntervalStrategy, defineWorker } from '@andrew_l/app';

export default defineWorker({
  name: 'clock',

  // Built-in strategy: fire a task every second
  executeStrategy: new IntervalStrategy({ intervalSeconds: 1 }),

  // Concurrency options
  taskParallel: 2, // tasks running at the same time (default: 2)
  taskLimit: 50, // max queue depth before backpressure fires (default: 50)

  entry() {
    // this.timerSequence — context field added by IntervalStrategy
    this.log.info('tick #%d', this.timerSequence);
  },
});
```

### Setup state and methods

`setup` and `methods` work the same as in `defineApp`. `this.worker` is always available in every hook.

```ts
export default defineWorker({
  name: 'mailer',
  executeStrategy: new IntervalStrategy({ intervalSeconds: 30 }),

  setup() {
    return { transport: createTransport() };
  },

  methods: {
    async send(to: string, body: string) {
      await this.transport.sendMail({ to, body });
    },
  },

  async entry(props, abortSignal) {
    const pending = await fetchPending();
    for (const msg of pending) {
      if (abortSignal.aborted) break;
      await this.send(msg.to, msg.body);
    }
  },
});
```

### Return values from `entry`

Return a `WorkerResult` (or an array) to signal success or skip. Returning nothing is treated as `{ success: true }`.

```ts
import type { WorkerResult } from '@andrew_l/app';

entry(): WorkerResult {
  if (nothingToDo) {
    return { skip: true, code: 'empty' };
  }
  return { success: true, code: 'processed', count: 5 };
},
```

### Custom strategy

Implement `WorkerStrategy<C>` where `C` extends `WorkerStrategy.Context` to carry per-task data into `entry`.

```ts
import type { WorkerInstance, WorkerStrategy } from '@andrew_l/app';

// 1. Declare the per-task context your strategy produces
interface QueueTask extends WorkerStrategy.Context {
  jobId: string;
  payload: unknown;
}

// 2. Implement the strategy
class RedisQueueStrategy implements WorkerStrategy<QueueTask> {
  private worker!: WorkerInstance;
  private sub!: RedisClient;

  doSetup({ worker }: { worker: WorkerInstance }) {
    this.worker = worker;
    this.sub = createRedisClient();
  }

  startSignal() {
    this.sub.subscribe('jobs', message => {
      this.worker.addTask(this.createTask(message));
    });
  }

  stopSignal(done: () => void) {
    this.sub.unsubscribe('jobs');
    done();
  }

  doShutdown() {
    this.sub.quit();
  }

  createTask(message: string): QueueTask {
    const { jobId, payload } = JSON.parse(message);
    return { jobId, payload };
  }

  // Optional: veto a task before entry runs
  executeSignal(ctx: QueueTask) {
    if (isDuplicate(ctx.jobId)) {
      return { skip: true, code: 'duplicate' };
    }

    return { success: true, code: 'ok' };
  }

  // Optional: react to the result after entry finishes
  completeSignal(ctx: QueueTask, result: WorkerResult | WorkerResult[]) {
    ack(ctx.jobId);
  }

  // Optional: pause ingestion when queue is full
  overloadedSignal() {
    this.sub.pause();
  }
  availableSignal() {
    this.sub.resume();
  }
}

// 3. Use it
export default defineWorker({
  name: 'job-processor',
  executeStrategy: new RedisQueueStrategy(),

  entry() {
    // this.jobId and this.payload are fully typed
    await processJob(this.jobId, this.payload);
  },
});
```

### Strategy interface reference

| Method / Hook                 | Required | Description                                                    |
| ----------------------------- | -------- | -------------------------------------------------------------- |
| `doSetup({ worker })`         | ✓        | Called once during worker setup — store the `WorkerInstance`   |
| `startSignal()`               | ✓        | Start producing tasks (open subscriptions, start timers, etc.) |
| `stopSignal(done)`            | ✓        | Drain/close the source, then call `done()` to close the queue  |
| `doShutdown()`                | ✓        | Final cleanup after the pool drains                            |
| `createTask()`                | ✓        | Return a fresh per-task context object                         |
| `executeSignal(ctx)`          |          | Veto a task before `entry` runs; return skip to drop it        |
| `completeSignal(ctx, result)` |          | Called after `entry` finishes with the result                  |
| `overloadedSignal()`          |          | Fired once when queue depth exceeds 80 % of `taskLimit`        |
| `availableSignal()`           |          | Fired once when queue depth drops back below the threshold     |
| `handleEntryError(err)`       |          | Convert an uncaught entry error into a `WorkerResult`          |

## 🤔 Why Use This Package?

- **No boilerplate** — no manual `process.argv` parsing, no `.env` wiring, no signal handlers
- **Typed props** — define once, get CLI flags, env variables, and TypeScript types for free
- **Structured lifecycle** — clear separation between setup, run, stop, and shutdown
- **Worker threads** — scale any app to N threads with a single `--threads` flag
- **Dev mode** — run TypeScript directly with `--dev`; use `--watch` to reload on file changes

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@andrew_l/app?style=flat
[npm-version-href]: https://npmjs.com/package/@andrew_l/app
[license-src]: https://img.shields.io/npm/l/@andrew_l/app?style=flat
