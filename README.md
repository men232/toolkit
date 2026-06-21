# Andrew L. Toolkit

A monorepo of focused, production-grade TypeScript packages for building Node.js services, CLI tools, and web applications. Each package is independently versioned, tree-shakeable, and ships with full type definitions.

[Documentation](https://men232.github.io/toolkit) · [Issues](https://github.com/men232/toolkit/issues)

## Overview

This repository collects libraries developed and refined across years of building production systems. They share a few guiding principles:

- **Small surface area** — each package solves one problem well and stays out of your way.
- **No hidden runtime cost** — minimal dependencies, no global state, tree-shakeable ESM builds.
- **Type-first** — APIs are designed around TypeScript inference, not bolted on after.
- **Composable** — packages are independent; pick what you need.

## Packages

### Application & Runtime

| Package                                               | Description                                                                                                                                                                                   |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@andrew_l/app`](./packages/app)                     | Define application entry points with typed props, lifecycle hooks, and workers. Ships with the `vrun` CLI for single-file execution, watch mode, worker threads, and multi-app orchestration. |
| [`@andrew_l/graceful`](./packages/graceful)           | Coordinated shutdown for long-running processes — register cleanup hooks, handle signals, and ensure resources drain before exit.                                                             |
| [`@andrew_l/context`](./packages/context)             | Composition-API-style context for Node.js. Share state and dependencies across async boundaries without prop drilling.                                                                        |
| [`@andrew_l/ioc`](./packages/ioc)                     | Minimal IoC container — constructor injection, scoped lifetimes, no decorators required.                                                                                                      |
| [`@andrew_l/service-actor`](./packages/service-actor) | Carry per-request data (trace IDs, user context, tenant) across function calls without threading it manually through every signature.                                                         |

### Core Utilities

| Package                                | Description                                                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@andrew_l/toolkit`](./packages/core) | The general-purpose utility library — promise helpers, schedulers, type guards, encoding, paths, and more. The foundation most other packages build on. |
| [`@andrew_l/dom`](./packages/dom)      | Browser utilities for animations, clipboard interaction, and smooth scrolling.                                                                          |

### Logging & Diagnostics

| Package                                           | Description                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [`@andrew_l/binlog`](./packages/binlog)           | High-throughput binary logging for Node.js — structured records, low overhead, suitable for hot paths. |
| [`@andrew_l/pino-pretty`](./packages/pino-pretty) | A Pino transport for human-readable, colorized log output.                                             |

### Data, Encoding & IDs

| Package                                                               | Description                                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`@andrew_l/tl-pack`](./packages/tl-pack)                             | Compact binary serialization format with a typed schema.                                    |
| [`@andrew_l/snowflake`](./packages/snowflake)                         | Snowflake-style 64-bit ID generator — sortable, distributed-friendly, dependency-free.      |
| [`@andrew_l/search-query-language`](./packages/search-query-language) | Parse human-readable search strings (e.g. `status:open author:alice`) into structured ASTs. |

### MongoDB

| Package                                                       | Description                                                                                                    |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [`@andrew_l/mongo-pagination`](./packages/mongo-pagination)   | Cursor-based pagination that avoids the pitfalls of offset/skip — stable across writes, consistent under load. |
| [`@andrew_l/mongo-transaction`](./packages/mongo-transaction) | Manage side effects inside MongoDB transactions — automatic rollback on failure and idempotency on retries.    |

### Terminal UI

| Package                                         | Description                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [`@andrew_l/vue-stdout`](./packages/vue-stdout) | Vue renderer for the terminal — build interactive CLIs with components, flexbox layouts, and reactive state. |

## Getting Started

Each package is published to npm under the `@andrew_l/*` scope and installs independently:

```bash
npm install @andrew_l/toolkit
# or
pnpm add @andrew_l/app
```

For example, to scaffold a runnable application with typed CLI flags:

```ts
// server.app.ts
import { defineApp } from '@andrew_l/app';

export default defineApp({
  name: 'server',
  props: {
    port: { type: Number, default: () => 3000 },
  },
  entry(props) {
    console.log(`listening on :${props.port}`);
  },
});
```

```bash
npx vrun server.app.ts --port 8080
```

See each package's README and the [documentation site](https://men232.github.io/toolkit) for full API references and examples.

## Development

This repository is managed with pnpm workspaces.

```bash
pnpm install         # install dependencies
pnpm build           # build all packages
pnpm test            # run the full test suite
pnpm --filter @andrew_l/app dev   # work on a single package
```

## Acknowledgements

Many of the utilities in this repository are inspired by, or adapted from, work in the broader open-source community. Credit is given in individual package READMEs where applicable. This collection is a continuation of that effort — thank you to everyone whose work made it possible.

## License

MIT
