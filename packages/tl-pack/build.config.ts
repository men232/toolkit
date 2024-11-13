import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index.ts', 'src/stream.ts'],
  declaration: true,
  sourcemap: true,
  rollup: {
    emitCJS: true,
  },
});
