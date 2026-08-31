// `tsc --noEmit` (unlike `vue-tsc`) does not understand `.vue` imports on its
// own. This ambient shim lets `test/sfc-vite.test.ts` type-check a static
// `import Simple from './fixtures/Simple.vue'`.
declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<{}, {}, any>;
  export default component;
}
