import { defineConfig } from 'vitest/config';
import vue from 'unplugin-vue/vite';

export default defineConfig({
  // `ssr: false`: this package has no server renderer, and vitest's
  // `environment: 'node'` drives Vite's SSR transform by default, which
  // compiles `.vue` into a render function that calls `useSSRContext()` --
  // throwing the moment `createApp().mount()` runs. Same reasoning as
  // `@andrew_l/vue-stdout`'s own `vite.config.ts`.
  plugins: [vue({ ssr: false })],
  // Nothing here runs in a browser, so there is nothing to prebundle for;
  // letting the dep optimizer discover `vue` hands back a `.vite/deps/vue.js`
  // path a plain Node module runner cannot resolve.
  optimizeDeps: { noDiscovery: true, include: [] },
  test: {
    environment: 'node',
  },
});
