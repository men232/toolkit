import { defineApp } from '../index.js';

// Intentionally leaks a ref'd timer that is never cleared by the lifecycle
// hooks — representing a resource the app doesn't tear down (e.g. a handle
// cleaned up only via a graceful `onShutdown` handler, not the app `shutdown`).
// Without `onShutdown: () => processGraceful()` in the child bootstrap, this
// keeps the child's event loop alive after `shutdownApp`, so the child hangs
// and is eventually SIGKILLed by the parent. With `processGraceful()` the child
// `process.exit(0)`s regardless of the lingering handle.
const app = defineApp({
  name: 'long-running-app',
  description: 'fixture that keeps the event loop alive via a leaked timer',
  logger: false,

  entry() {
    setInterval(() => {}, 1_000);
  },
});

export default app;
