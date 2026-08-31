# cli-vite — bundling a vue-stdout CLI

The path you take to ship: `.vue` and `.tsx` compiled by vite into a single
executable file.

```bash
pnpm install
pnpm build
pnpm start
```

## The two plugins

```ts
plugins: [vue(), vueJsx()]
```

That is the whole configuration, and it is the point of this example: a
vue-stdout app is built like any other Vue app. `@andrew_l/vue-stdout` has no
preset to spread and no `isCustomElement` to pass, because its host tags are
private — `src/cli.tsx` and `src/Stats.vue` author with `<Box>` and `<Text>`,
which are ordinary components resolved through an import.

You can check that rather than take it on faith:

```bash
pnpm build
grep -c resolveComponent dist/cli.mjs   # 0
pnpm start                              # renders, stderr stays empty
```

Hosts that drive Vite's SSR transform are the exception. This renderer mounts
with `createApp().mount()` and has no server renderer, so SSR-flavoured output
throws the moment a component mounts — under `vitest` set
`test.testTransformMode.web`, and under `vite build --ssr` set
`environments.ssr.consumer: 'client'`. If neither trade-off suits, swap the
plugins for `unplugin-vue` and `unplugin-vue-jsx`, which make client output a
supported option (`vue({ ssr: false })`); that is what `@andrew_l/vue-stdout`'s
own test suite does. A plain client build like this one needs none of it.

## Bundling notes

- `build.lib` with `formats: ['es']` produces one ESM file.
- Everything in `dependencies` stays external — a CLI resolves those from
  `node_modules` at runtime; only your own sources belong in the bundle.
- The `#!/usr/bin/env node` banner makes `dist/cli.mjs` directly executable,
  which is what the `bin` field in `package.json` points at.
