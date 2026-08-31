# cli-tsx — running vue-stdout with no build step

The shortest path from a `.vue` file to a running TUI: two Node loaders, no
bundler, no `dist/`.

```bash
pnpm install
pnpm start
```

## How it works

```
node --import tsx --import @andrew_l/vue-stdout/register src/main.ts
```

- **`tsx`** compiles TypeScript.
- **`@andrew_l/vue-stdout/register`** installs a Node module hook that compiles
  `.vue` single-file components.

**The order is load-bearing.** `register` must come after `tsx`: the SFC hook
hands the `<script lang="ts">` half of a component back to the loader chain to
be transpiled, so `tsx` has to already be in it.

`bin.mjs` shows how a published CLI supplies those flags itself, since its
users will not.

## What it needs installed

`@vue/compiler-sfc` compiles the components and `esbuild` transpiles
`<script lang="ts">`. Both are optional peer dependencies of vue-stdout — the
`/register` entry point asks for them by name if they are missing.

## `.vue` here, not `.tsx`

This is the SFC path. Plain `tsx` compiles JSX through `vue/jsx-runtime`,
which passes component children as arrays rather than slot functions — Vue
warns about it on every element, straight into the terminal. If you want to
write `.tsx`, use a bundler that runs `@vue/babel-plugin-jsx`; see the
`cli-vite` example next door.
