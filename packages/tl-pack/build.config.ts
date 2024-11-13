import { resolve } from 'node:path';
import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index.ts', 'src/stream.ts'],
  declaration: true,
  sourcemap: true,
  rollup: {
    emitCJS: true,
  },
  alias: {
    '@': resolve(__dirname, 'src'),
  },
});
