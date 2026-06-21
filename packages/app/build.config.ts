import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index.ts', { input: 'src/vrun', name: 'vrun' }],
  declaration: true,
  sourcemap: true,
  rollup: {
    emitCJS: true,
    esbuild: {
      jsx: 'automatic',
    },
  },
});
