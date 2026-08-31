# Vue Stdout Toolkit

[![npm](https://img.shields.io/npm/v/@andrew_l/vue-stdout?style=flat-square&color=f76707&labelColor=2b2f36&label=npm)](https://www.npmjs.com/package/@andrew_l/vue-stdout)
[![license](https://img.shields.io/npm/l/@andrew_l/vue-stdout?style=flat-square&color=f76707&labelColor=2b2f36)](https://github.com/men232/toolkit/blob/main/LICENSE)

A custom Vue.js renderer for outputting content directly to the terminal (stdout), combining the flexibility of Vue with the power of console-based rendering.

[Documentation](https://men232.github.io/toolkit/reference/@andrew_l/vue-stdout/) · [Toolkit](https://github.com/men232/toolkit) · [Issues](https://github.com/men232/toolkit/issues)

<!-- install placeholder -->

## ✨ Features

- **Terminal Flex Layout:** Built with Yoga Layout for flexible box-based terminal layouts.
- **Base Components:** Simplifies rendering common elements like boxes, text, and progress bars.
- **Single-file components first:** `<template>` is the primary authoring surface, and it runs with no build step at all via `@andrew_l/vue-stdout/register`. JSX is supported alongside it.
- **TypeScript Ready:** Full TypeScript support for enhanced developer experience.
- **Lightweight:** Minimal bundle size to ensure fast and efficient runtime performance.

## 🚀 Usage Example

`createApp(Main).mount()` mounts a component and streams it to the terminal —
it is the only entry point. It is Vue's own `createApp`, so `app.use()`,
`app.component()`, `app.provide()` and `app.config` all work exactly as they
do in a browser app; only `mount()` differs, taking streams instead of a DOM
element. Write that component as a single-file component (see
[`playground/demos/Progress.vue`](./playground/demos/Progress.vue) for a
runnable version of this example — `pnpm dev progress`).

```vue
<!-- Main.vue -->
<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { Box, ProgressBar, Text } from '@andrew_l/vue-stdout';

const progress = ref(0);

const timer = setInterval(() => {
  progress.value++;
}, 100);

onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <Box borderStyle="round">
    <Text>
      <Text>Hello From</Text>
      <Text color="green"> Vue {{ (progress / 4) % 2 !== 0 ? '🤯' : '' }}</Text>
    </Text>

    <ProgressBar
      variant="round"
      :showPercent="true"
      :color="progress >= 100 ? 'cyan' : 'green'"
      :value="progress"
    />
  </Box>
</template>
```

```js
// main.js
import { createApp } from '@andrew_l/vue-stdout';
import Main from './Main.vue';

const app = createApp(Main);

app.mount();

// Keep the process alive until the UI is done. Resolves on `app.unmount()`,
// `useApp().exit()`, Ctrl+C or a signal; rejects on `useApp().exit(error)`.
await app.waitUntilExit();
```

> **Spell props whichever way you like.** `<Box borderStyle="round">` and
> `<Box border-style="round">` are the same prop, as are `<Text dimColor>` and
> `<Text dim-color>`. Bare boolean attributes (`<Text bold>`, `<Text dim-color>`)
> are fine in either spelling too. The examples here use camelCase, which is what
> JSX requires and what the API reference lists.

<details>
<summary>The same component in JSX — the supplementary path</summary>

JSX is fully supported and is the better tool when a screen's *structure* is
computed rather than written out. It is supplementary in two concrete senses:
it needs a bundler running a Vue JSX plugin (see
[Vite / TSX setup](#-vite--tsx-setup)), which the no-build `/register` path does
not provide, and this package's own showcase keeps one `.tsx` demo rather than
six (`pnpm dev layout`).

```jsx
import { defineComponent, onBeforeUnmount, ref } from 'vue';
import { Box, ProgressBar, Text, createApp } from '@andrew_l/vue-stdout';

const Main = defineComponent(() => {
  const progress = ref(0);

  const timer = setInterval(() => {
    progress.value++;
  }, 100);

  onBeforeUnmount(() => clearInterval(timer));

  return () => (
    <Box borderStyle="round">
      <Text>
        <Text>Hello From</Text>
        <Text color="green">
          {' '}
          Vue {(progress.value / 4) % 2 !== 0 ? '🤯' : ''}
        </Text>
      </Text>

      <ProgressBar
        variant="round"
        showPercent
        color={progress.value >= 100 ? 'cyan' : 'green'}
        value={progress.value}
      />
    </Box>
  );
});

createApp(Main).mount();
```

</details>

`mount()` is where the streams go. Its argument is the mount *target* — the
role `app.mount('#app')` plays in a browser app — either a bare `WriteStream`
(`app.mount(process.stderr)`) or an options object controlling how, and how
often, output actually reaches the terminal:

```js
app.mount({
  // Where the app renders, and where it reads keys from. Default to
  // `process.stdout` / `process.stdin` / `process.stderr`.
  stdout: process.stdout,
  stdin: process.stdin,
  stderr: process.stderr,

  // Cap how often a frame is actually written -- `30` (the default) matches
  // ink; `0` writes every frame as soon as it's computed, uncapped. The
  // trailing frame of a burst is never lost even when throttled.
  maxFps: 30,

  // Repaint only the lines that changed between two frames instead of
  // erasing and rewriting the whole thing -- fewer bytes on the wire for a
  // tall frame where only one line ticks. `false` by default, matching ink.
  incrementalRendering: false,

  // Render into the terminal's alternate screen buffer, restored on exit.
  // `false` by default.
  alternateScreen: false,

  // Intercept console.log/info/warn/error for this mount's lifetime so
  // output from anywhere in the process lands above the frame instead of
  // splitting it in two. `true` by default, matching ink.
  patchConsole: true,

  // Write each committed update as its own separate, appended output --
  // nothing erased, nothing diffed. Useful when output is redirected to a
  // file, where ANSI erase sequences are just noise. `false` by default.
  debug: false,

  // Override automatic interactive-mode detection (CI, or a non-TTY
  // `stdout`, are both non-interactive by default). Leave unset to let it
  // auto-detect.
  interactive: undefined,

  // Called after each committed frame with `{ renderTime }` (milliseconds
  // spent laying out and painting it).
  onRender: ({ renderTime }) => console.log(`rendered in ${renderTime}ms`),
});
```

See `MountOptions`' own doc comments (`src/createApp.ts`) for the full
behavioural contract of each -- in particular how `debug`, `maxFps`,
`incrementalRendering` and `alternateScreen` each interact with
non-interactive mode.

One app owns one output stream at a time: mounting a second app on a stream
that already has a live one throws, because two apps painting the same
terminal interleave erase sequences and cursor moves into each other's
frames. `app.unmount()` frees the stream again.

Need the output as a plain string instead (tests, docs, snapshots)? Use
`renderToString()` — it renders synchronously without touching stdout or
starting a persistent app:

```js
import { renderToString } from '@andrew_l/vue-stdout';

const output = renderToString(Main, { columns: 80 });
```

Output (with `progress` pinned at `100`; a `<Box>` lays its children out in a
row unless told otherwise, so the bar sits beside the text rather than under
it):

```
╭──────────────────────────────────────────────────────────────────────────────╮
│Hello From Vue 🤯╭─────╮                                                      │
│                 │ 100%│                                                      │
│                 ╰─────╯                                                      │
╰──────────────────────────────────────────────────────────────────────────────╯
```

## ⌨️ Handling Input & Focus

Beyond the app itself, this package ports ink's input/focus composables:
`useInput`, `useApp`, `useStdin`, `useStdout`, `useStderr`, `useFocus`,
`useFocusManager`, `usePaste`, `useCursor`, and `useWindowSize`. All of them
must be called from a component mounted via `createApp().mount()`.

`useStdout()` returns `{ stdout, write, clear }`. `write()` puts a string
straight on the stream, past the component tree; `clear()` erases the terminal
so the next frame paints onto a blank screen (a no-op in non-interactive mode
and under `debug`, where nothing has been painted to erase). `clear()` lives
here, rather than on the app, because it needs the live terminal — which
exists only between `mount()` and unmount, exactly the window in which a
component can call it.

`useWindowSize()` returns `{ columns, rows }` refs that update when the
terminal is resized. Flex layouts re-flow on resize on their own, so reach for
it when you compute from the size in JS — `'─'.repeat(columns.value)`, a
column count worked out by hand — which a plain `useStdout().stdout.columns`
read would freeze at its mount-time value.

`useCursor` positions the terminal cursor over the rendered output (IME
composition, a text caret). It takes an optional reactive position source —
`useCursor(() => ({ x: text.value.length, y: 0 }))` keeps the caret at the end
of the text with no watcher of your own — and returns `setCursorPosition` for
imperative callers.

`useInput` subscribes to raw keystrokes; `useFocus` makes a component
"focusable" so Tab/Shift+Tab can move between several of them, and hands back
an `isFocused` ref you can feed straight into another `useInput`'s
`isActive` option — the idiom below uses to keep arrow keys scoped to
whichever list currently has focus. See
[`playground/demos/SelectList.vue`](./playground/demos/SelectList.vue) and
[`playground/demos/Focus.vue`](./playground/demos/Focus.vue) for the full
runnable source (`pnpm dev focus`), condensed here:

`useFocusManager()` drives focus from outside a focusable: `focusNext()`,
`focusPrevious()`, `focus(id)`, a read-only `activeId`, and `isFocusEnabled` —
a writable ref that turns focus management (and Tab/Shift+Tab) on and off.

```js
const { isFocusEnabled, focusNext, activeId } = useFocusManager();

isFocusEnabled.value = false; // ink's disableFocus()
isFocusEnabled.value = true; // ink's enableFocus()
```

Reading it works too, so a component can render the current mode or bind a
toggle straight to it. As in ink, disabling only flips the flag: whichever
component is focused keeps its focus, and what stops is Tab/Shift+Tab
navigation and Escape-to-clear.

```vue
<!-- SelectList.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { Box, Text, useFocus, useInput } from '@andrew_l/vue-stdout';

const props = defineProps<{
  id: string;
  items: string[];
  autoFocus?: boolean;
}>();

const { isFocused } = useFocus({ id: props.id, autoFocus: props.autoFocus });
const selectedIndex = ref(0);

// Only handles arrow keys while THIS list is focused -- `isActive: isFocused`
// re-subscribes/unsubscribes live as focus moves.
useInput(
  (_input, key) => {
    if (key.upArrow) {
      selectedIndex.value =
        (selectedIndex.value - 1 + props.items.length) % props.items.length;
    } else if (key.downArrow) {
      selectedIndex.value = (selectedIndex.value + 1) % props.items.length;
    }
  },
  { isActive: isFocused },
);
</script>

<template>
  <Box borderStyle="round" :borderColor="isFocused ? 'cyan' : 'gray'">
    <Text
      v-for="(item, index) in items"
      :key="item"
      :inverse="index === selectedIndex"
      >{{ item }}</Text
    >
  </Box>
</template>
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import { useApp, useInput, Box } from '@andrew_l/vue-stdout';
import SelectList from './SelectList.vue';

const { exit } = useApp();

// Global, always active -- `q` exits regardless of which list is focused.
// Ctrl+C needs no code of its own: mount()'s default exitOnCtrlC already
// tears the app down once anything has put stdin into raw mode.
useInput(input => {
  if (input === 'q') exit();
});

const FRUITS = ['Apple', 'Banana', 'Cherry'];
const COLORS = ['Red', 'Green', 'Blue'];
</script>

<template>
  <Box>
    <SelectList id="fruits" :items="FRUITS" :autoFocus="true" />
    <SelectList id="colors" :items="COLORS" />
  </Box>
</template>
```

The composables are plain functions and behave identically from `.tsx` — call
them from `setup()` and read `isFocused.value` yourself. What differs is only
the authoring surface; see [Vite / TSX setup](#-vite--tsx-setup) for what a
`.tsx` build needs.

## 📦 Starting a project

Two setups, both runnable in this repository:

| Example | Command | What it shows |
| --- | --- | --- |
| [`examples/cli-tsx`](./examples/cli-tsx) | `pnpm start` | `.vue` with **no build step** — two Node loaders and nothing else |
| [`examples/cli-vite`](./examples/cli-vite) | `pnpm build && pnpm start` | `.vue` **and** `.tsx` bundled by vite into one executable file |

The no-build path chains two module hooks, and the order matters:

```bash
node --import tsx --import @andrew_l/vue-stdout/register src/main.ts
```

`register` has to come *after* `tsx`: the SFC hook hands the
`<script lang="ts">` half of a component back to the loader chain, so `tsx`
must already be in it. `@vue/compiler-sfc` and `esbuild` are optional peer
dependencies — `/register` names them if they are missing.

That path is for `.vue` only, and it is the reason SFCs are the primary
authoring surface: a `.vue` CLI needs no bundler at all. Plain `tsx` compiles
JSX through `vue/jsx-runtime`, which hands component children over as arrays
rather than slot functions and makes Vue warn on every component. To write
`.tsx`, use a bundler that runs `@vue/babel-plugin-jsx` — see the next
section.

## 🛠️ Playground

`pnpm dev` in this package opens a menu of demo screens covering layout, text
wrapping, focus, `<Static>`, throttled rendering and a bare counter.
`pnpm dev <name>` opens one directly, `pnpm dev --list` prints the names.

There is one dev command, and it runs the playground through the dev server
described under [hot reloading](#hot-reloading-in-development) — so editing a
demo's template updates it in place instead of restarting the process. `--list`
is the exception: it is answered straight from `playground/catalog.ts` and
starts no server, so listing the demos cannot fail for a dev server's reasons.

`pnpm dev <name>` is a thin wrapper (`playground/dev.ts`) over that server. The
demo name cannot travel on `argv` — under the dev server `process.argv` belongs
to `vite` — so the wrapper puts it in `VUE_STDOUT_DEMO`, which is also how you
set it by hand: `VUE_STDOUT_DEMO=focus pnpm dev`.

> **Editing `playground/vite.config.ts` while `pnpm dev` is running is
> undefined behaviour.** Vite restarts on a config change by building the
> replacement server before closing the original, so for that moment two
> mounted apps each believe they own the terminal — raw mode, the cursor and
> the alternate screen get set twice and restored once. There is no
> terminal-ownership registry yet. Stop the server before editing that file.

Five of the six are single-file components. `layout` is deliberately `.tsx`,
so the supplementary JSX path stays compiled, type-checked and mounted on
every run rather than only described.

The demos import the renderer from `src/`, not from `dist/`, so an engine
change shows up on the next hot update with no build in between. It is also the
only place real raw mode runs against the real terminal — the test suite
[fails any test that tries](./test/setup/no-real-raw-mode.ts) — so this is
where interactive behaviour gets checked by hand. Every demo is mounted and
unmounted by `test/playground.test.ts`, so a broken one fails the suite rather
than waiting to be discovered.

## ⚡ Vite / TSX setup

**There is nothing to configure.** A vue-stdout app builds like any other Vue
app, with the stock plugins and no options:

```js
// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';

export default defineConfig({
  // `vue()` alone is enough for a `.vue`-only app. `vueJsx()` is what makes
  // `.tsx` compile at all -- neither this package nor
  // `@andrew_l/vue-stdout/register` provides a JSX transform.
  plugins: [vue(), vueJsx()],
});
```

`<Box>`, `<Text>` and the rest are ordinary Vue components, already compiled
inside the published package, so every compiler resolves them the way it
resolves any import. The renderer's own host tags are private, hyphenated and
never reach your build — you will not find `resolveComponent` in your bundle.
`examples/cli-vite` is exactly this config; run `pnpm build && pnpm start`
there to see it.

That covers a normal `vite build`, which never drives Vite's SSR transform.

### Hot reloading in development

`@andrew_l/vue-stdout/dev` is a Vite plugin that runs your CLI inside the dev
server's own process, so editing a `.vue` template repaints the frame **without
losing state** — a counter keeps counting.

```js
// vite.config.js
import { defineConfig } from 'vite';
import vue from 'unplugin-vue/vite';
import { vueStdoutDev } from '@andrew_l/vue-stdout/dev';

export default defineConfig({
  plugins: [vue({ ssr: false }), vueStdoutDev({ entry: 'src/main.ts' })],
});
```

Then `vite`. Your entry stays an ordinary `createApp(App).mount()`; the plugin
finds it, runs it, and closes the server when the app exits.

What each kind of edit does, which is Vue's own behaviour rather than
something this package invents:

| edit | result |
| --- | --- |
| an SFC `<template>` | repaints in place, component state kept |
| an SFC `<script>` | the component is recreated, its own state resets |
| anything with no accepting importer | the terminal is released and a fresh app mounts |
| a `.tsx` file | always a full reload — Vue's JSX plugins emit no rerender path |

Three caveats worth knowing before you turn it on. `vite` must be installed (it
is an optional peer). Compile errors currently land as Vite's own error output
rather than as a panel inside your frame, which is honest but not pretty.

And **editing `vite.config.js` itself while the server runs is undefined
behaviour.** A config change makes Vite restart by building the replacement
server before closing the original, so for that moment two mounted apps each
believe they own the terminal: raw mode, the cursor and the alternate screen
are set twice and restored once, and what you get back is whichever teardown
ran last. Nothing arbitrates terminal ownership between sessions yet. Stop the
server, edit the config, start it again.

The plugin needs the SFC compiler to emit **client** output, which is why the
example above uses `unplugin-vue` with `ssr: false` rather than
`@vitejs/plugin-vue` — the same reason described below.

### Hosts that drive the SSR transform

`vitest` with `environment: 'node'` and `vite build --ssr` do drive it, and
that needs one deliberate choice — this renderer mounts with
`createApp().mount()` and has no server renderer, so SSR-flavoured output
throws the moment a component mounts (`useSSRContext()` is `undefined`).

The `@vitejs` plugins take the `ssr` flag from their host on every hook call
and expose no option to override it, so under such a host they must be worked
around at the config level:

- `vitest` — `test.testTransformMode.web`. Cost: the whole module graph goes
  browser-flavoured, so Node idioms in test files break and need excluding.
- `vite build --ssr` — `environments.ssr.consumer: 'client'`. Cost: also flips
  `resolve.conditions`/`mainFields` to browser defaults.

The alternative is a plugin that treats client output as a supported option.
[`unplugin-vue`](https://github.com/unplugin/unplugin-vue) resolves `ssr` once
at construction and defaults it to `false`, and
[`unplugin-vue-jsx`](https://github.com/unplugin/unplugin-vue-jsx) has no SSR
code path at all:

```js
// vitest.config.js
import vue from 'unplugin-vue/vite';
import vueJsx from 'unplugin-vue-jsx/vite';

export default defineConfig({
  plugins: [vue({ ssr: false }), vueJsx({ version: 3 })],
});
```

This package's own test suite takes that route; see its `vite.config.ts`. It
used to ship two wrapper functions from `@andrew_l/vue-stdout/vite` that
monkey-patched the `@vitejs` plugins' hooks instead — that entry point has been
removed, and the two options above replace it: drop the wrappers and use the
stock `@vitejs` plugins with the options shown above.

## 🤔 Why Use This Package?

1. **Optimized for Terminal:** Ideal for CLI applications, interactive tools, and dashboards.
2. **Vue Ecosystem:** Leverages Vue’s declarative and reactive system for building rich console interfaces.
3. **Flexibility with Components:** Provides reusable components like Box, Text, and ProgressBar for structured layouts.
4. **TypeScript Support:** Offers type definitions for better IDE support and error checking.
