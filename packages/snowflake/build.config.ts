import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index.ts'],
  declaration: true,
  sourcemap: true,
  rollup: {
    emitCJS: true,
  },
});
