import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index.ts', 'src/mongoose-7.ts', 'src/mongoose-8.ts'],
  declaration: true,
  sourcemap: true,
  rollup: {
    emitCJS: true,
  },
});
