<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./docs/public/logo-dark.svg">
  <img src="./docs/public/logo-light.svg" alt="" width="104" height="104">
</picture>

# `@andrew_l` · toolkit

**A monorepo of focused, production-grade TypeScript packages**<br>
for Node.js services, CLI tools, and web applications.

<br>

[![npm](https://img.shields.io/npm/v/@andrew_l/toolkit?style=flat-square&color=f76707&labelColor=2b2f36&label=npm)](https://www.npmjs.com/org/andrew_l)
[![license](https://img.shields.io/badge/license-MIT-f76707?style=flat-square&labelColor=2b2f36)](./LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A518.12-f76707?style=flat-square&labelColor=2b2f36)](https://nodejs.org)
[![types](https://img.shields.io/badge/types-included-f76707?style=flat-square&labelColor=2b2f36)](https://www.typescriptlang.org)
[![docs](https://img.shields.io/badge/docs-men232.github.io-f76707?style=flat-square&labelColor=2b2f36)](https://men232.github.io/toolkit)

<br>

[**Documentation**](https://men232.github.io/toolkit) · [**Packages**](#packages) · [**Quick start**](#quick-start) · [**Issues**](https://github.com/men232/toolkit/issues)

</div>

<br>

---

<br>

## Why

These libraries were developed and refined across years of building production systems.
They are opinionated in a single direction — **stay small, stay predictable**.

|                            |                                                                                     |
| :------------------------- | :---------------------------------------------------------------------------------- |
| ◇&nbsp; **Small surface**  | Each package solves one problem well and then gets out of your way.                 |
| ◇&nbsp; **No hidden cost** | Minimal dependencies, no global state, tree-shakeable ESM builds.                   |
| ◇&nbsp; **Type-first**     | APIs designed around TypeScript inference, not bolted on after.                     |
| ◇&nbsp; **Composable**     | Every package stands alone. Take one, take all, mix with whatever you already have. |

<br>

## Quick start

```bash
pnpm add @andrew_l/toolkit     # npm i / yarn add — all work the same
```

Everything is published to npm under the [`@andrew_l/*`](https://www.npmjs.com/org/andrew_l) scope
and installs independently — there is no meta-package to pull in.

<br>

## Packages

<sub>**⚙️ APPLICATION & RUNTIME**</sub>

| Package                                               | Description                                                                                                                                                                                   |
| :---------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@andrew_l/app`](./packages/app)                     | Define application entry points with typed props, lifecycle hooks, and workers. Ships with the `vrun` CLI for single-file execution, watch mode, worker threads, and multi-app orchestration. |
| [`@andrew_l/graceful`](./packages/graceful)           | Coordinated shutdown for long-running processes — register cleanup hooks, handle signals, drain resources before exit.                                                                        |
| [`@andrew_l/context`](./packages/context)             | Composition-API-style context for Node.js. `provide` / `inject` across async boundaries, with scoped disposal.                                                                                |
| [`@andrew_l/ioc`](./packages/ioc)                     | Minimal IoC container — constructor injection, scoped lifetimes, no decorators required.                                                                                                      |
| [`@andrew_l/service-actor`](./packages/service-actor) | Carry per-request data (trace IDs, user, tenant) across calls without threading it through every signature.                                                                                   |

<sub>**🧰 CORE UTILITIES**</sub>

| Package                                | Description                                                                                                                                             |
| :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`@andrew_l/toolkit`](./packages/core) | The general-purpose utility library — promise helpers, schedulers, type guards, encoding, paths, and more. The foundation most other packages build on. |
| [`@andrew_l/dom`](./packages/dom)      | Browser utilities for animations, clipboard interaction, and smooth scrolling.                                                                          |

<sub>**📊 LOGGING & DIAGNOSTICS**</sub>

| Package                                           | Description                                                                                            |
| :------------------------------------------------ | :----------------------------------------------------------------------------------------------------- |
| [`@andrew_l/binlog`](./packages/binlog)           | High-throughput binary logging for Node.js — structured records, low overhead, suitable for hot paths. |
| [`@andrew_l/pino-pretty`](./packages/pino-pretty) | A Pino transport for human-readable, colorized log output.                                             |

<sub>**🧬 DATA, ENCODING & IDS**</sub>

| Package                                                               | Description                                                                                 |
| :-------------------------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| [`@andrew_l/tl-pack`](./packages/tl-pack)                             | Compact binary serialization format with a typed schema.                                    |
| [`@andrew_l/snowflake`](./packages/snowflake)                         | Snowflake-style 64-bit ID generator — sortable, distributed-friendly, dependency-free.      |
| [`@andrew_l/search-query-language`](./packages/search-query-language) | Parse human-readable search strings (e.g. `status:open author:alice`) into structured ASTs. |

<sub>**🍃 MONGODB**</sub>

| Package                                                       | Description                                                                                                    |
| :------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------- |
| [`@andrew_l/mongo-pagination`](./packages/mongo-pagination)   | Cursor-based pagination that avoids the pitfalls of offset/skip — stable across writes, consistent under load. |
| [`@andrew_l/mongo-transaction`](./packages/mongo-transaction) | Manage side effects inside transactions — automatic rollback on failure, idempotency on retries.               |

<sub>**🖥️ TERMINAL UI**</sub>

| Package                                         | Description                                                                                                  |
| :---------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| [`@andrew_l/vue-stdout`](./packages/vue-stdout) | Vue renderer for the terminal — build interactive CLIs with components, flexbox layouts, and reactive state. |

<br>

## In practice

<details open>
<summary><b>Run a typed application from a single file</b></summary>
<br>

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

</details>

<details>
<summary><b>Share state across async boundaries</b></summary>
<br>

```ts
import { inject, provide, withContext } from '@andrew_l/context';

const main = withContext(async () => {
  provide('user', { id: 1, name: 'Andrew' });

  await loadDashboard(); // no prop drilling
});

async function loadDashboard() {
  const user = inject('user'); // → { id: 1, name: 'Andrew' }
}
```

</details>

<details>
<summary><b>Generate sortable, distributed-friendly IDs</b></summary>
<br>

```ts
import { Snowflake } from '@andrew_l/snowflake';

const snowflake = new Snowflake({ epoch: 1751810749563 });

snowflake.generate(); // → 7286...n   monotonic bigint
snowflake.generateBuffer(); // → Uint8Array(8)
```

<sub>~16M ids/sec in the buffer path — see the [benchmark](./packages/snowflake#readme).</sub>

</details>

<details>
<summary><b>Turn a search box into a MongoDB query</b></summary>
<br>

```ts
import { parseToMongoose } from '@andrew_l/search-query-language';

// GET /clients?search=active=true AND age>=18
app.get('/clients', async (req, res) => {
  const filter = parseToMongoose(Client, req.query.search);
  // → { $and: [{ active: true }, { age: { $gte: 18 } }] }

  res.json(await Client.find(filter).lean());
});
```

<sub>Fields are validated against the schema, so an unknown key never reaches the database.</sub>

</details>

<details>
<summary><b>Readable logs, without giving up Pino</b></summary>
<br>

![pino-pretty output](https://raw.githubusercontent.com/men232/toolkit/refs/heads/main/packages/pino-pretty/assets/sample.png?raw=true)

</details>

<br>

Full API references and per-package guides live on the [documentation site](https://men232.github.io/toolkit).

<br>

## Development

Managed with [pnpm](https://pnpm.io) workspaces. Node `>=18.12`, pnpm `11.11.0`.

```bash
pnpm install                       # install dependencies
pnpm build                         # build every package
pnpm test                          # run the full test suite
pnpm lint                          # eslint across the workspace
pnpm docs:dev                      # preview the documentation site

pnpm --filter @andrew_l/app test:watch    # work on a single package
```

<br>

## Acknowledgements

Many utilities here are inspired by, or adapted from, work in the broader open-source community.
Credit is given in individual package READMEs where applicable — this collection is a continuation
of that effort. Thank you to everyone whose work made it possible.

<br>

<div align="center">

**MIT** © [Andrew L.](https://github.com/men232)

</div>
