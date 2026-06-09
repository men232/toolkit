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

  async entry({ port, host }) {
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
